import requests
import json

SERVER_URL = "http://localhost:3000/execute"

def test_action(action, args):
    payload = {
        "schema_version": "1.0.1",
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "reasoning": "Test",
        "action": action,
        "args": args
    }
    response = requests.post(SERVER_URL, json=payload)
    print(f"{action}: {response.json().get('outcome')} - {response.text}")

test_action("WRITE_FILE", {"path": "/sandbox/test.md", "content": "Hello"})
test_action("READ_FILE", {"path": "/sandbox/test.md"})
test_action("LIST_FILES", {"path": "/sandbox/"})
