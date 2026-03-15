import sys
import os
import json
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent import AgentInterface


def make_agent():
    with patch("agent.Anthropic") as mock_cls:
        mock_cls.return_value = MagicMock()
        agent = AgentInterface(api_key="test_key")
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
        mock_resp = MagicMock()
        mock_resp.text = json.dumps(self.parsed)
        self.agent.client.messages.create.return_value = mock_resp
        self.mock_resp = mock_resp

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
        self.agent.proposal_history = [("m", "r")] * 4
        self.agent.agentprompt("test")
        self.agent.client.messages.create.assert_not_called()

    def test_returns_none_on_exception(self):
        self.agent.client.messages.create.side_effect = Exception("API down")
        result = self.agent.agentprompt("test")
        self.assertIsNone(result)


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
        with patch("agent.requests.post", return_value=self.mock_http):
            result = self.agent.reqhttp('{"action":"THINK"}')
        self.assertEqual(result, {"result": "ok"})

    def test_returns_none_on_connection_error(self):
        with patch("agent.requests.post", side_effect=Exception("refused")):
            result = self.agent.reqhttp('{"action":"THINK"}')
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
