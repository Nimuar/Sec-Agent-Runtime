import sys
import os
import json
import unittest
import requests
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent import AgentInterface


def make_agent():
    with patch("agent.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "test_key"}):
            agent = AgentInterface(api_key="test_key")
        agent.mock_client = mock_client
    return agent


# --- Init ---

class TestInit(unittest.TestCase):

    def test_agent_starts_active(self):
        agent = make_agent()
        self.assertTrue(agent.active)

    def test_history_starts_empty(self):
        agent = make_agent()
        self.assertEqual(agent.proposal_history, [])

    def test_default_max_retries(self):
        agent = make_agent()
        self.assertEqual(agent.max_retries, 3)


# --- agentprompt ---

class TestAgentPrompt(unittest.TestCase):

    def setUp(self):
        self.agent = make_agent()
        self.parsed = {"proposal": {"action": "THINK"}}
        self.mock_resp = MagicMock()
        self.mock_resp.text = json.dumps(self.parsed)
        self.agent.mock_client.models.generate_content.return_value = self.mock_resp

    def test_returns_inactive_message_when_closed(self):
        self.agent.active = False
        result = self.agent.agentprompt("hello")
        self.assertEqual(result, "Interface not active")

    def test_successful_call_appends_history(self):
        self.agent.agentprompt("test")
        self.assertEqual(len(self.agent.proposal_history), 1)

    def test_successful_call_returns_response(self):
        result = self.agent.agentprompt("test")
        self.assertEqual(result, self.parsed)

    def test_no_api_call_when_retries_exceeded(self):
        self.agent.proposal_history = [("m", "r")] * 3
        self.agent.agentprompt("test")
        self.agent.mock_client.models.generate_content.assert_not_called()

    def test_returns_json_error_on_exception(self):
        self.agent.mock_client.models.generate_content.side_effect = Exception("API down")
        result = self.agent.agentprompt("test")
        error_data = json.loads(result)
        self.assertEqual(error_data["outcome"], "EXECUTION_ERROR")


# --- close / open ---

class TestCloseOpen(unittest.TestCase):

    def test_close_deactivates_agent(self):
        agent = make_agent()
        agent.close()
        self.assertFalse(agent.active)

    def test_close_clears_history(self):
        agent = make_agent()
        agent.proposal_history = [("m", "r")]
        agent.close()
        self.assertEqual(agent.proposal_history, [])

    def test_open_activates_agent(self):
        agent = make_agent()
        agent.active = False
        agent.open()
        self.assertTrue(agent.active)


# --- reqhttp ---

class TestReqHttp(unittest.TestCase):

    def setUp(self):
        self.agent = make_agent()
        self.mock_http = MagicMock()
        self.mock_http.status_code = 200
        self.mock_http.json.return_value = {"result": "ok"}

    def test_returns_json_on_success(self):
        with patch("agent.requests.post", return_value=self.mock_http) as mock_post:
            result = self.agent.reqhttp({"action": "THINK"})
            mock_post.assert_called_once()
            self.assertEqual(mock_post.call_args[1]['json'], {"action": "THINK"})
        self.assertEqual(result, {"result": "ok"})

    def test_returns_error_dict_on_connection_error(self):
        with patch("agent.requests.post", side_effect=requests.exceptions.RequestException("refused")):
            result = self.agent.reqhttp({"action": "THINK"})
        self.assertEqual(result["outcome"], "EXECUTION_ERROR")


if __name__ == "__main__":
    unittest.main()
