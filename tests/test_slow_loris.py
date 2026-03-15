import unittest
import socket
import json
import time
from tests.runtime_client import RuntimeClient

class TestSlowLoris(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = RuntimeClient()
        cls.host = "localhost"
        cls.port = 3000

    def test_slow_request_body(self):
        """Simulates a slow sender to verify the server doesn't hang."""
        print("\nStarting Slow-Loris simulation (partial body)...")
        
        s = socket.create_connection((self.host, self.port))
        
        # Send headers
        headers = (
            "POST /execute HTTP/1.1\r\n"
            f"Host: {self.host}\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: 50\r\n"
            "Connection: keep-alive\r\n"
            "\r\n"
        )
        s.send(headers.encode())
        
        # Send partial body
        s.send(b'{"action": ')
        print("Sent partial body, waiting 2 seconds...")
        time.sleep(2)
        
        # While the first request is hanging, verify the server handles a second request
        # (Node.js is asynchronous, so this should pass easily)
        print("Verifying server responsiveness during slow request...")
        health_resp = self.client.execute({
            "schema_version": "1.0.1",
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "reasoning": "Concurrency check",
            "action": "THINK",
            "args": {}
        })
        self.assertEqual(health_resp.get("outcome"), "SUCCESS")
        
        # Finish the slow request
        s.send(b'"THINK"}')
        # We don't necessarily care if the slow request succeeds (it might timeout)
        # but we care that the server didn't block.
        s.close()
        print("Slow-Loris test complete. Resilience verified.")

if __name__ == "__main__":
    unittest.main()
