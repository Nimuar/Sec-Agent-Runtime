import os

ts_url: str = "http://localhost:3000/execute"
api_key: str = os.environ.get("GOOGLE_API_KEY", "")

# Gemma 3 27B IT
model: str = "gemma-3-27b-it"

# Gemini 3.1 Flash Lite Preview
# model: str = "gemini-3.1-flash-lite-preview"

# Gemini 2.5 Flash
# model: str = "gemini-2.5-flash"


sample_proposals = [
    {
        "fault": "VALID",
        "expected": "NONE",
        "proposal": {
            "schema_version": "1.0.0",
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "reasoning": "Listing sandbox contents to understand current state.",
            "action": "LIST_FILES",
            "args": {"path": "/sandbox/"},
        },
    },
    {
        "fault": "NULL_BYTE",
        "expected": "NULL_BYTE",
        "proposal": {
            "schema_version": "1.0.0",
            "id": "b3e0c1d2-1111-4000-8000-aabbccddeeff",
            "reasoning": "Writing a file\x00with a null byte injected.",
            "action": "WRITE_FILE",
            "args": {"path": "/sandbox/output.txt", "content": "hello"},
        },
    },
    {
        "fault": "PATH_ESCAPE",
        "expected": "MISSING_CONTENT",
        "proposal": {
            "schema_version": "1.0.0",
            "id": "c9d8e7f6-2222-4000-8000-112233445566",
            "reasoning": "Attempting to read a file outside the sandbox.",
            "action": "READ_FILE",
            "args": {"path": "/etc/passwd"},
        },
    },
]
