import os

ts_url: str = "http://localhost:3000/execute"
api_key: str = os.environ.get("GOOGLE_API_KEY", "")

# --- ACTIVE MODEL ---
# Uncomment only ONE model below to use for execution. 
# You can rotate these as you exhaust the GenerativeLanguage API quotas.

# Gemma 3 Family (Requires inlined system instructions - Handled automatically)
model: str = "gemma-3-27b-it"
# model: str = "gemma-3-12b-it"
# model: str = "gemma-3-4b-it"
# model: str = "gemma-3-1b-it"

# Gemini Family (Natively supports GenerateContentConfig system instructions)
# model: str = "gemini-3.1-flash-lite-preview"
# model: str = "gemini-2.0-flash"
# model: str = "gemini-2.0-flash-lite-preview-02-05"
# model: str = "gemini-1.5-flash"
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
