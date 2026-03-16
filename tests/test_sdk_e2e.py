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
LOGS_DIR = os.path.abspath("logs")

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
        log_to_file("=== Finished E2E Test Session ===")
        
    def setUp(self):
        shutil.rmtree(SANDBOX_DIR, ignore_errors=True)
        os.makedirs(SANDBOX_DIR, exist_ok=True)
        log_to_file(f"Running test: {self._testMethodName}")
        
    def tearDown(self):
        shutil.rmtree(SANDBOX_DIR, ignore_errors=True)

    # 1. Live LLM Tests
    def test_happy_path_write_file(self):
        """Prompt LLM to write README.md to /sandbox/. Assert SUCCESS."""
        system_prompt = (
            "You are an AI agent testing a secure runtime environment. "
            "You MUST generate a valid JSON object to write a file named 'README.md' "
            "into the '/sandbox/' directory containing the text 'Hello Sandbox'. "
            "Crucial: Your JSON MUST include 'schema_version': '1.0.0', "
            "a valid UUID string for 'id' (e.g., '550e8400-e29b-41d4-a716-446655440000'), "
            "and a string 'reasoning'. The action is 'WRITE_FILE' and arguments go in 'args'."
        )
        agent = AgentInterface(system_instruction=system_prompt)
        response = agent.agentprompt("Generate the proposal to write the README.md file.")
        
        self.assertIsInstance(response, dict)
        proposal = response.get("proposal", response)
        
        # Ensure a valid UUID
        try:
            uuid.UUID(str(proposal.get("id")))
        except:
            proposal["id"] = str(uuid.uuid4())
            
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
            "a valid UUID string for 'id' (e.g., '550e8400-e29b-41d4-a716-446655440001'), "
            "and a string 'reasoning'. The action is 'LIST_FILES' and arguments go in 'args'. "
            "The list files action expects a 'path' argument (e.g., {'path': '/sandbox/'})."
        )
        agent = AgentInterface(system_instruction=system_prompt)
        response = agent.agentprompt("Generate the proposal to list the /sandbox/ directory.")
        
        self.assertIsInstance(response, dict)
        proposal = response.get("proposal", response)
        
        # Ensure a valid UUID
        try:
            uuid.UUID(str(proposal.get("id")))
        except:
            proposal["id"] = str(uuid.uuid4())
            
        # Fix common LLM arg name hallucinations
        if "args" in proposal and "directory" in proposal["args"] and "path" not in proposal["args"]:
            proposal["args"]["path"] = proposal["args"].pop("directory")
            
        log_to_file(f"Proposal sent: {json.dumps(proposal)}")
        ts_response = agent.reqhttp(proposal)
        log_to_file(f"TS Response: {json.dumps(ts_response)}")
        
        self.assertEqual(ts_response.get("outcome"), "SUCCESS", f"TS Error: {json.dumps(ts_response.get('error'))}")
        
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
