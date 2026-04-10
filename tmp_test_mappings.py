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

print("Testing READ_FILE missing file...")
test_action("READ_FILE", {"path": "/sandbox/does_not_exist.txt"})

print("Testing WRITE_FILE missing directory...")
test_action("WRITE_FILE", {"path": "/sandbox/missing_dir/foo.txt", "content": "hello"})

print("Testing LIST_FILES missing directory...")
test_action("LIST_FILES", {"path": "/sandbox/missing_dir/"})
