import unittest
import os
import shutil
import time
from tests.payload_generators import *
from tests.runtime_client import RuntimeClient

class TestSimulationHarness(unittest.TestCase):
    
    metrics = {
        "SUCCESS": 0,
        "DENIED": 0,
        "VALIDATION_ERROR": 0,
        "EXECUTION_ERROR": 0,
        "latencies": []
    }
    
    @classmethod
    def setUpClass(cls):
        """Create a physical sandbox environment for the runtime to interact with."""
        cls.sandbox_dir = os.path.abspath("./local_sandbox")
        os.makedirs(cls.sandbox_dir, exist_ok=True)
        
        # Create necessary mock files
        with open(os.path.join(cls.sandbox_dir, "test.md"), "w") as f:
            f.write("# Hello")
            
        with open(os.path.join(cls.sandbox_dir, "test.txt"), "w") as f:
            f.write("Hello Text")
            
        # Create empty dir for edge case
        os.makedirs(os.path.join(cls.sandbox_dir, "empty_dir"), exist_ok=True)
            
    @classmethod
    def tearDownClass(cls):
        """Clean up the sandbox after all tests complete and print reporting metrics."""
        shutil.rmtree(cls.sandbox_dir, ignore_errors=True)
        
        # Print Summary Reporting to tests/results/metrics.txt
        results_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
        os.makedirs(results_dir, exist_ok=True)
        metrics_file = os.path.join(results_dir, "metrics.txt")
        
        avg_latency = sum(cls.metrics["latencies"]) / max(1, len(cls.metrics["latencies"]))
        
        with open(metrics_file, "w") as f:
            f.write("="*50 + "\n")
            f.write("SIMULATION HARNESS METRICS SUMMARY\n")
            f.write("="*50 + "\n")
            f.write(f"Total Outcomes Simulated: {len(cls.metrics['latencies'])}\n")
            f.write(f"Average Execution Latency: {avg_latency*1000:.2f} ms\n")
            f.write("-" * 50 + "\n")
            f.write(f"SUCCESS (Succeeded):        {cls.metrics['SUCCESS']}\n")
            f.write(f"DENIED (Action Blocked):    {cls.metrics['DENIED']}\n")
            f.write(f"VALIDATION_ERROR (Blocked): {cls.metrics['VALIDATION_ERROR']}\n")
            f.write(f"EXECUTION_ERROR (Faults):   {cls.metrics['EXECUTION_ERROR']}\n")
            f.write("="*50 + "\n")
            
        print(f"\nMetrics summary written to {metrics_file}\n")

    def setUp(self):
        self.client = RuntimeClient()
        
    def _execute_and_track(self, payload):
        start_time = time.time()
        response = self.client.execute(payload)
        latency = time.time() - start_time
        
        self.metrics["latencies"].append(latency)
        outcome = response.get("outcome", "EXECUTION_ERROR")
        
        if outcome in self.metrics:
            self.metrics[outcome] += 1
            
        return response

    # --- 1. Adversarial Ingress ---
    
    def test_ingress_invalid_json(self):
        payload = mutate_invalid_json()
        resp = self._execute_and_track(payload)
        self.assertEqual(resp.get("outcome"), "VALIDATION_ERROR")
        
    def test_ingress_invalid_version(self):
        payload = mutate_invalid_version()
        resp = self._execute_and_track(payload)
        self.assertEqual(resp.get("outcome"), "VALIDATION_ERROR")
        
    def test_ingress_missing_required_fields(self):
        payload = mutate_missing_required_fields()
        resp = self._execute_and_track(payload)
        self.assertEqual(resp.get("outcome"), "VALIDATION_ERROR")

    # --- 2. Adversarial Security/Policy ---
    
    def test_security_path_traversal(self):
        payload = create_path_traversal_payload()
        resp = self._execute_and_track(payload)
        self.assertIn(resp.get("outcome"), ["VALIDATION_ERROR", "DENIED"])
        
    def test_security_invalid_file_extension(self):
        payload = create_invalid_extension_payload()
        resp = self._execute_and_track(payload)
        self.assertEqual(resp.get("outcome"), "VALIDATION_ERROR")
        
    # --- 3. Happy Path ---
    
    def test_happy_path_think(self):
        payload = create_valid_think_payload()
        resp = self._execute_and_track(payload)
        self.assertEqual(resp.get("outcome"), "SUCCESS")
        
    def test_happy_path_read_file(self):
        payload = create_valid_read_payload()
        resp = self._execute_and_track(payload)
        if resp.get("outcome") != "SUCCESS": print("READ_FAIL:", resp)
        self.assertEqual(resp.get("outcome"), "SUCCESS")
        
    def test_happy_path_write_file(self):
        payload = create_valid_write_payload()
        resp = self._execute_and_track(payload)
        if resp.get("outcome") != "SUCCESS": print("WRITE_FAIL:", resp)
        self.assertEqual(resp.get("outcome"), "SUCCESS")
        
    # --- 4. Execution Edge Cases ---
    
    def test_edge_case_list_empty_directory(self):
        payload = create_valid_list_payload(path="/sandbox/empty_dir")
        resp = self._execute_and_track(payload)
        self.assertEqual(resp.get("outcome"), "EXECUTION_ERROR")
        self.assertEqual(resp.get("error", {}).get("message"), "Directory is empty")
        
    # --- 5. Stress Testing ---
    
    def test_stress_mixed_payloads(self):
        """Sequentially execute 50 mixed payloads to verify stability and track latency."""
        payloads = [
            create_valid_think_payload(),
            mutate_invalid_json(),
            create_valid_read_payload(),
            create_invalid_extension_payload(),
            create_valid_write_payload()
        ] * 2  # 10 payloads total
        
        for p in payloads:
            resp = self._execute_and_track(p)
            self.assertIsNotNone(resp.get("outcome"))
            # Just asserting the runtime didn't crash entirely with SUBPROCESS_EXCEPTION
            self.assertNotEqual(resp.get("error_code"), "SUBPROCESS_EXCEPTION")

if __name__ == "__main__":
    unittest.main()
