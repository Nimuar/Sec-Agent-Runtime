import json
import requests
import os


class RuntimeClient:
    """Client for executing payloads against the Express API server."""

    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initializes the RuntimeClient.
        Args:
            base_url: The base URL of the running Express server.
        """
        self.base_url = base_url.rstrip("/")

    def execute(self, payload: dict | str) -> dict:
        """
        Executes a JSON payload against the Express API via HTTP POST.

        Args:
            payload: Formatted dictionary or invalid string representation of a payload.

        Returns:
            dict: The parsed JSON response (`RuntimeResponse` schema) from the API.
            If the response isn't valid JSON, it returns a dict wrapping an EXECUTION_ERROR.
        """
        url = f"{self.base_url}/execute"
        
        try:
            if isinstance(payload, str):
                try:
                    # Try to see if it's already valid JSON
                    payload_data = json.loads(payload)
                    response = requests.post(url, json=payload_data)
                except json.JSONDecodeError:
                    # If it's totally invalid JSON (adversarial), send it as raw bytes/text
                    # But the server uses app.use(express.json()), so it might fail with 400.
                    # We send it as 'data' and set content-type application/json to test server resilience.
                    response = requests.post(url, data=payload, headers={"Content-Type": "application/json"})
            else:
                response = requests.post(url, json=payload)

            # Return the JSON body if possible
            try:
                return response.json()
            except json.JSONDecodeError:
                return {
                    "outcome": "EXECUTION_ERROR",
                    "error_code": "INVALID_JSON_RESPONSE",
                    "status_code": response.status_code,
                    "raw_response": response.text,
                }

        except Exception as e:
            return {
                "outcome": "EXECUTION_ERROR",
                "error_code": "HTTP_CLIENT_EXCEPTION",
                "error": str(e),
            }
