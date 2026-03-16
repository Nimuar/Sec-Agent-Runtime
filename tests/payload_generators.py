import json
import uuid


def generate_uuid() -> str:
    """Generates a standard UUID string for the proposal id."""
    return str(uuid.uuid4())


def create_base_payload(
    action: str, args: dict, reasoning: str = "Automated testing"
) -> dict:
    """Creates a valid base proposal according to the schema constraints."""
    return {
        "schema_version": "1.0.1",
        "id": generate_uuid(),
        "reasoning": reasoning,
        "action": action,
        "args": args,
    }


# --- Valid Generators ---


def create_valid_think_payload() -> dict:
    return create_base_payload("THINK", {}, "Thinking about next steps")


def create_valid_read_payload(path: str = "/sandbox/test.md") -> dict:
    return create_base_payload("READ_FILE", {"path": path}, f"Reading {path}")


def create_valid_write_payload(
    path: str = "/sandbox/test.txt", content: str = "Hello World!"
) -> dict:
    return create_base_payload(
        "WRITE_FILE", {"path": path, "content": content}, f"Writing to {path}"
    )


def create_valid_list_payload(path: str = "/sandbox/empty_dir") -> dict:
    return create_base_payload("LIST_FILES", {"path": path}, f"Listing {path}")


# --- Adversarial Generators ---


def mutate_invalid_json() -> str:
    """Returns a deliberately broken JSON string."""
    valid_json = json.dumps(create_valid_think_payload())
    # Strip the last curly brace to break parsing
    return valid_json[:-1]


def mutate_invalid_version() -> dict:
    """Returns a payload with an unsupported version string."""
    payload = create_valid_think_payload()
    payload["schema_version"] = "2.0.0"
    return payload


def mutate_missing_required_fields() -> dict:
    """Returns a payload missing the 'action' field."""
    payload = create_valid_think_payload()
    del payload["action"]
    return payload


def mutate_oversized_payload() -> dict:
    """Returns a payload that exceeds the expected 1024 character limit."""
    payload = create_valid_think_payload()
    payload["reasoning"] = "A" * 1500
    return payload


def create_path_traversal_payload() -> dict:
    """Returns a payload attempting path traversal."""
    return create_valid_read_payload(path="../../etc/passwd")


def create_invalid_extension_payload() -> dict:
    """Returns a payload attempting to write a forbidden file extension."""
    return create_valid_write_payload(path="/sandbox/test.sh", content="echo 'hacked'")


def create_extension_mismatch_rename_payload() -> dict:
    """Returns a payload attempting to rename a .txt to a .md, which is forbidden."""
    return create_base_payload(
        "RENAME_FILE",
        {"source": "/sandbox/test.txt", "destination": "/sandbox/test.md"},
        "Renaming extension",
    )
