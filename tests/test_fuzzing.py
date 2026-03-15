import unittest
import random
import string
import time
from tests.runtime_client import RuntimeClient

class TestFuzzing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = RuntimeClient()

    def test_random_binary_fuzzing(self):
        """Sends 50 iterations of raw randomized bytes to the API."""
        print("\nStarting fuzzed binary injection test...")
        url = f"{self.client.base_url}/execute"
        
        for i in range(50):
            # Generate random noise (binary/text mix)
            length = random.randint(1, 2048)
            noise = ''.join(random.choice(string.printable + '\0\n\t') for _ in range(length))
            
            # Send via raw POST
            try:
                resp = self.client.execute(noise)
                # Regardless of the outcome, the client should return a valid dict
                # (either from server or client error mapper)
                self.assertIsInstance(resp, dict)
            except Exception as e:
                self.fail(f"Client crashed on iteration {i}: {e}")

        # Final check: Verify the server is still alive and responsive
        final_resp = self.client.execute({
            "schema_version": "1.0.1",
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "reasoning": "Post-fuzzing health check",
            "action": "THINK",
            "args": {}
        })
        self.assertEqual(final_resp.get("outcome"), "SUCCESS")
        print("Fuzzing test complete. Server is healthy.")

if __name__ == "__main__":
    unittest.main()
