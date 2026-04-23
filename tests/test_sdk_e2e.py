import json
import os
import shutil
import unittest
import pytest
import requests
import uuid
from datetime import datetime

from runtime.agent_sdk.agent import AgentInterface

SERVER_URL = "http://localhost:3000/execute"
SANDBOX_DIR = os.path.abspath("runtime/sandbox")
LOGS_DIR = os.path.abspath("runtime/logs")

def log_to_file(message):
    os.makedirs(LOGS_DIR, exist_ok=True)
    log_file = os.path.join(LOGS_DIR, "e2e_tests.log")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"{timestamp} {message}\n")
    print(message)

class TestSDKE2E(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        os.makedirs(SANDBOX_DIR, exist_ok=True)
        log_to_file("=== Starting E2E Test Session ===")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SANDBOX_DIR, ignore_errors=True)
        
        try:
            audit_files = [f for f in os.listdir(LOGS_DIR) if f.startswith("audit_run_") and f.endswith(".jsonl")]
            if audit_files:
                latest_audit = max([os.path.join(LOGS_DIR, f) for f in audit_files], key=os.path.getmtime)
                log_to_file(f"Running evaluation pipeline on {latest_audit}")
                
                import sys
                project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                if project_root not in sys.path:
                    sys.path.insert(0, project_root)
                    
                from evaluation.loader import load_log_entries
                from evaluation.classifier import classify_entries
                from evaluation.engine import compute_metrics
                from evaluation.reporter import generate_report

                raw_entries = load_log_entries(latest_audit)
                classified_entries = classify_entries(raw_entries)
                result = compute_metrics(classified_entries)
                timestamp_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results", f"metrics_report_{timestamp_str}.md")
                
                generate_report(classified_entries, result, report_path)
                log_to_file(f"Evaluation report generated successfully at {report_path}")
            else:
                log_to_file("No audit logs found for evaluation pipeline.")
        except Exception as e:
            log_to_file(f"Failed to run evaluation pipeline: {e}")
            
        log_to_file("=== Finished E2E Test Session ===")
        
    def setUp(self):
        shutil.rmtree(SANDBOX_DIR, ignore_errors=True)
        os.makedirs(SANDBOX_DIR, exist_ok=True)
        log_to_file(f"Running test: {self._testMethodName}")
        
    def tearDown(self):
        shutil.rmtree(SANDBOX_DIR, ignore_errors=True)

    def _sanitize_proposal(self, proposal, force_uuid=True, clean_ascii=True):
        if not isinstance(proposal, dict):
            return proposal
        if force_uuid:
            proposal["id"] = str(uuid.uuid4())
        if clean_ascii:
            import re
            def _clean_val(val):
                if isinstance(val, str):
                    return re.sub(r'[^\x00-\x7F]+', '', val)
                elif isinstance(val, dict):
                    return {k: _clean_val(v) for k, v in val.items()}
                elif isinstance(val, list):
                    return [_clean_val(v) for v in val]
                return val
            proposal = _clean_val(proposal)
        return proposal

    # 1. Live LLM Tests
    def test_happy_path_write_file(self):
        """Prompt LLM to write README.md to /sandbox/. Assert SUCCESS."""
        system_prompt = (
            "You are an AI agent testing a secure runtime environment. "
            "You MUST generate a valid JSON object to write a file named 'README.md' "
            "into the '/sandbox/' directory containing the text 'Hello Sandbox'. "
            "Crucial: Your JSON MUST include 'schema_version': '1.0.0', "
            "a completely novel and random valid UUID v4 for the 'id' field, "
            "and a highly creative, unique reasoning string in 'reasoning'. "
            "The action is 'WRITE_FILE' and the 'args' object MUST use exactly these field names: "
            "'path' (the file path, e.g. '/sandbox/README.md') and 'content' (the file content). "
            "Do NOT use 'file_path' or any other field name — it MUST be 'path'."
        )
        agent = AgentInterface(system_instruction=system_prompt)
        response = agent.agentprompt("Generate the proposal to write the README.md file.")
        
        self.assertIsInstance(response, dict)
        proposal = response.get("proposal", response)
        proposal = self._sanitize_proposal(proposal)
            
        log_to_file(f"Proposal sent: {json.dumps(proposal)}")
        ts_response = agent.reqhttp(proposal)
        log_to_file(f"TS Response: {json.dumps(ts_response)}")
        
        self.assertEqual(ts_response.get("outcome"), "SUCCESS", f"TS Error: {json.dumps(ts_response.get('error'))}")
        
        readme_path = os.path.join(SANDBOX_DIR, "README.md")
        self.assertTrue(os.path.exists(readme_path))
        with open(readme_path, "r") as f:
            self.assertIn("Hello Sandbox", f.read())

    def test_happy_path_list_files(self):
        """Prompt LLM to list /sandbox/. Assert SUCCESS."""
        with open(os.path.join(SANDBOX_DIR, "test_file.txt"), "w") as f:
            f.write("test content")
            
        system_prompt = (
            "You are an AI agent testing a secure runtime environment. "
            "You MUST generate a valid JSON object to list the files in the '/sandbox/' directory. "
            "Crucial: Your JSON MUST include 'schema_version': '1.0.0', "
            "a completely novel and random valid UUID v4 for the 'id' field, "
            "and a highly creative, unique reasoning string in 'reasoning'. "
            "The action is 'LIST_FILES' and arguments go in 'args'. "
            "The list files action expects a 'path' argument (e.g., {'path': '/sandbox/'})."
        )
        agent = AgentInterface(system_instruction=system_prompt)
        response = agent.agentprompt("Generate the proposal to list the /sandbox/ directory.")
        
        self.assertIsInstance(response, dict)
        proposal = response.get("proposal", response)
        proposal = self._sanitize_proposal(proposal)
            
        log_to_file(f"Proposal sent: {json.dumps(proposal)}")
        ts_response = agent.reqhttp(proposal)
        log_to_file(f"TS Response: {json.dumps(ts_response)}")
        
        self.assertEqual(ts_response.get("outcome"), "SUCCESS", f"TS Error: {json.dumps(ts_response.get('error'))}")
        
    def _run_llm_fault_test(self, requested_fault, expected_runtime_outcome):
        """Helper to run fuzz_prompt.txt driven dynamic tests."""
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "runtime", "agent_sdk", "prompts", "fuzz_prompt.txt")
        with open(prompt_path, "r") as f:
            system_prompt = f.read()

        agent = AgentInterface(system_instruction=system_prompt)
        
        import time
        import re
        import time
        import re
        response = None
        for attempt in range(4):
            response = agent.agentprompt(f"Generate a proposal with the {requested_fault} fault.")
            
            if isinstance(response, dict) and response.get("error"):
                error_msg = str(response.get("error"))
                print(f"\n[Test Attempt {attempt+1}/4] LLM Error: {error_msg}", flush=True)
                
                if attempt < 3:
                    sleep_time = (attempt + 1) * 3
                    
                    match = re.search(r'retry in (\d+(?:\.\d+)?)s', error_msg)
                    if match:
                        sleep_time = float(match.group(1)) + 1.0
                        
                    log_to_file(f"LLM API Error. Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)
                    continue
            
            # If the LLM successfully generated a dictionary but hallucinated the wrong fault type or no fault type
            if isinstance(response, dict) and response.get("fault") == requested_fault:
                break
                
            if attempt < 3:
                got_fault = response.get("fault") if isinstance(response, dict) else "None"
                log_to_file(f"LLM generated {got_fault} instead of {requested_fault}. Retrying...")
                time.sleep(2) # brief pause before hitting the LLM again
                continue
            
        self.assertIsInstance(response, dict, f"Expected LLM response to be a dict, got {type(response)}: {response}")
        
        # Output format defined in fuzz_prompt.txt
        fault = response.get("fault")
        expected_gate_error = response.get("expected")
        proposal = response.get("proposal")
        
        # Sanitize LLM payload unless the test specifically requires the dirty data
        force_uuid = (requested_fault != "ID_COLLISION" and requested_fault != "INVALID_UUID")
        clean_ascii = (requested_fault != "INVALID_ASCII")
        proposal = self._sanitize_proposal(proposal, force_uuid=force_uuid, clean_ascii=clean_ascii)
        
        # If testing for PAYLOAD_OVERFLOW, guarantee the payload strictly breaks the 1024-byte Zod threshold
        # even if an under-parameterized LLM output a string that was too short.
        if requested_fault == "PAYLOAD_OVERFLOW" and isinstance(proposal, dict):
            if "reasoning" in proposal and len(str(proposal["reasoning"])) < 2000:
                proposal["reasoning"] = str(proposal["reasoning"]) + (" Overflow! " * 200)

        self.assertEqual(fault, requested_fault, f"LLM did not generate the requested fault type. Got {fault}")
        log_to_file(f"Fuzz test '{requested_fault}': proposal generated -> {json.dumps(proposal)}")
        
        if requested_fault == "ID_COLLISION":
            # Send once successfully to establish the baseline
            agent.reqhttp(proposal)
            log_to_file("ID_COLLISION baseline successfully registered.")
            
        ts_response = agent.reqhttp(proposal)
        log_to_file(f"TS Response: {json.dumps(ts_response)}")
        
        self.assertEqual(ts_response.get("outcome"), expected_runtime_outcome, f"Expected {expected_runtime_outcome} but got {ts_response.get('outcome')}. Error: {ts_response.get('error')}")
        if expected_gate_error != "NONE":
            error_code = ts_response.get("error", {}).get("error_code")
            # We don't strictly assert the exact error code if the LLM misunderstood the expected one, 
            # but we can log it if it doesn't match the prompt's prediction.
            if error_code != expected_gate_error:
                log_to_file(f"Warning: Prompt predicted '{expected_gate_error}', but runtime gave '{error_code}'")

    def test_llm_fault_bad_action(self):
        """Prompt LLM for a BAD_ACTION fault. Verify the runtime rejects it as DENIED."""
        self._run_llm_fault_test("BAD_ACTION", "DENIED")
        
    def test_llm_fault_bad_extension(self):
        """Prompt LLM for a BAD_EXTENSION fault. Verify the runtime rejects it."""
        self._run_llm_fault_test("BAD_EXTENSION", "VALIDATION_ERROR")

    # 2. Hardcoded Deterministic Tests
    def test_payload_overflow(self):
        """Send a payload > 1024 bytes. Assert VALIDATION_ERROR."""
        payload = {
            "schema_version": "1.0.0",
            "id": str(uuid.uuid4()),
            "reasoning": "A" * 1500,
            "action": "THINK",
            "args": {}
        }
        log_to_file("Executing test_payload_overflow")
        response = requests.post(SERVER_URL, json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("outcome"), "VALIDATION_ERROR")

    def test_path_escape(self):
        """Send a WRITE_FILE action with path ../escape.txt. Assert VALIDATION_ERROR."""
        payload = {
            "schema_version": "1.0.0",
            "id": str(uuid.uuid4()),
            "reasoning": "Path traversal attempt",
            "action": "WRITE_FILE",
            "args": {
                "path": "../escape.txt",
                "content": "Malicious payload attempt"
            }
        }
        log_to_file("Executing test_path_escape")
        response = requests.post(SERVER_URL, json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("outcome"), "VALIDATION_ERROR")

    def test_schema_malformation(self):
        """Send a payload missing the schema_version field. Assert VALIDATION_ERROR."""
        payload = {
            "id": str(uuid.uuid4()),
            "reasoning": "Schema violation",
            "action": "THINK",
            "args": {}
        }
        log_to_file("Executing test_schema_malformation")
        response = requests.post(SERVER_URL, json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("outcome"), "VALIDATION_ERROR")

    def test_execution_enoent(self):
        """Send a READ_FILE action for /sandbox/does_not_exist.txt. Assert EXECUTION_ERROR."""
        payload = {
            "schema_version": "1.0.0",
            "id": str(uuid.uuid4()),
            "reasoning": "Read non-existent file",
            "action": "READ_FILE",
            "args": {
                "path": "/sandbox/does_not_exist.txt"
            }
        }
        log_to_file("Executing test_execution_enoent")
        response = requests.post(SERVER_URL, json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("outcome"), "EXECUTION_ERROR")

# Dynamically generate 110 deep LLM fault injection tests
def _generate_fault_tests(cls):
    categories = [
        ("NULL_BYTE", "VALIDATION_ERROR"),
        ("INVALID_ASCII", "VALIDATION_ERROR"),
        ("PAYLOAD_OVERFLOW", "VALIDATION_ERROR"),
        ("ID_COLLISION", "VALIDATION_ERROR"),
        ("MISSING_CONTENT", "VALIDATION_ERROR"),
        ("BAD_EXTENSION", "VALIDATION_ERROR"),
        ("PATH_ESCAPE", "VALIDATION_ERROR"), 
        ("BAD_ACTION", "DENIED"),
        ("WRONG_ARGS", "VALIDATION_ERROR"),
        ("INVALID_UUID", "VALIDATION_ERROR"),
        ("MISSING_FILE_EXECUTION", "EXECUTION_ERROR")
    ]
    
    for i in range(1, 11): # 10 iterations of 11 faults = 110 native LLM tests
        for fault, expected in categories:
            test_name = f"test_generated_llm_fault_{fault.lower()}_{i}"
            def test_func(self, f=fault, e=expected):
                self._run_llm_fault_test(f, e)
            test_func.__name__ = test_name
            test_func.__doc__ = f"Autogenerated LLM fault test {i} for {fault}"
            setattr(cls, test_name, test_func)

_generate_fault_tests(TestSDKE2E)

if __name__ == "__main__":
    unittest.main()
