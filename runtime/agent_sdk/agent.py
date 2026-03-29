from google import genai
from google.genai import types
import requests
import json
import re
import os
try:
    from . import AgentConfig
except ImportError:
    import AgentConfig
from dotenv import load_dotenv

load_dotenv()

_DIR = os.path.dirname(os.path.abspath(__file__))


class AgentInterface:
    def __init__(
        self,
        api_key: str = None,
        model: str = AgentConfig.model,
        max_retries: int = 5,
        system_instruction: str = None
    ):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")

        if not self.api_key:
            raise ValueError("API key is required to initialize the AgentInterface.")

        self.model = model
        self.system_instruction = system_instruction
        self.client = genai.Client(api_key=self.api_key)
        self.proposal_history = []
        self.active = True

    # Send a Proposal to Agent returns a response as a dictionary.
    def agentprompt(self, message: str) -> dict:
        # Confirm agent active (Should be if possible.)
        if not self.active:
            return {"error": "Interface not active", "outcome": "EXECUTION_ERROR"}
        else:
            try:
                kwargs = {}
                if self.system_instruction:
                    kwargs["config"] = types.GenerateContentConfig(
                        system_instruction=self.system_instruction
                    )

                response = self.client.models.generate_content(
                    model=self.model, contents=(message + "\n"), **kwargs
                )
                print("response: ", response)
                text = self._clean_json(response.text)
                parsed = json.loads(text)
                self.proposal_history.append((message, parsed))
                return parsed
            except json.JSONDecodeError as e:
                print(f"Failed to parse LLM response: {e}")
                return {"error": str(e), "outcome": "EXECUTION_ERROR"}
            except Exception as e:
                print(f"Error communicating with LLM: {e}")
                return {"error": str(e), "outcome": "EXECUTION_ERROR"}

    def _clean_json(self, text: str) -> str:
        """Strips markdown code blocks from the string."""
        text = re.sub(r'```json\s*(.*?)\s*```', r'\1', text, flags=re.DOTALL)
        text = re.sub(r'```\s*(.*?)\s*```', r'\1', text, flags=re.DOTALL)
        return text.strip()

    # Checking for agent activity turns agent on or off.
    def close(self):
        self.active = False
        print("Agent has closed - Deleting History")
        self.proposal_history = []

    def open(self):
        print("Agent has opened")
        self.active = True

    # send request through TS server. Reurns Response as JSON.
    def reqhttp(self, proposal_data) -> dict:
        # Try to send data to url, return output.
        try:
            response = requests.post(AgentConfig.ts_url, json=proposal_data, timeout=40)
            print(f"status: {response.status_code}")
            print(f"Request: {response.text}")
            return response.json()

        except requests.exceptions.JSONDecodeError as e:
            print(f"Server returned non-JSON response: {e}")
            return {
                "outcome": "EXECUTION_ERROR",
                "error": {"message": "Invalid JSON response from server"},
            }

        except requests.exceptions.RequestException as e:
            print(f"HTTP Request failed: {e}")
            return {"outcome": "EXECUTION_ERROR", "error": {"message": str(e)}}
