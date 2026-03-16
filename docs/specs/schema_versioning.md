# Proposal Schema Versioning Strategy

## Schema Versioning

The proposal schema follows **Semantic Versioning**:

Each proposal **MUST** include a top-level `schema_version` field indicating the schema version it conforms to.

#### Example

```json
{
  "schema_version": "1.0.0",
  "action": "read_file",
  "args": {
    "path": "/tmp/a.txt"
  }
}
```

### Supported Actions

Disallowed Actions (Core Schema)

The following actions are explicitly NOT ALLOWED in the core schema:

```"action": "run_command"```

```"action": "spawn_process"```

### Rationale (Design Decision)

These actions are intentionally excluded because:

- They allow untrusted LLM output to directly control the host system
- Writing a complete and correct security policy for arbitrary command execution is extremely difficult
- Verification is nearly impossible
- They significantly expand system scope, deviating from the core goal

Core Goal: policy enforcement and verifiable execution

For this reason, the core configuration does not provide ```run_command``` or ```spawn_process```.

### Compatibility Rules

Version Compatibility

- If proposal.MAJOR != runtime.SUPPORTED_MAJOR → incompatible
- If proposal.MAJOR == runtime.SUPPORTED_MAJOR → compatible
- MINOR and PATCH differences are allowed

#### Examples

| schema_version | compatibility |
|----------------|---------------|
| 5.0.0          | incompatible  |
| 1.8.5          | compatible    |

### Runtime Behavior on Version Mismatch

- MAJOR version mismatches result in explicit rejection
- The runtime MUST emit a structured error
- Silent fallback between schema versions is not permitted

| Situation            | Runtime External Output |
| -------------------- | ----------------------- |
| Compatible version   | Action result           |
| Incompatible version | Structured error        |
| Action not allowed   | Policy error            |
| Invalid args         | Validation error        |

#### Examples

##### Example 1: Schema Version Incompatible

Input from LLM:

```json
{
  "schema_version": "2.0.0",
  "action": "read_file",
  "args": {
    "path": "/tmp/a.txt"
  }
}
```

Runtime check:

proposal.schema_version = 2.0.0
runtime.supported = 1.x.x
→ MAJOR version mismatch → incompatible


Runtime output:

```json
{
  "error_code": "SCHEMA_VERSION_INCOMPATIBLE",
  "message": "Unsupported proposal schema version.",
  "received_version": "2.0.0",
  "supported_version_range": "1.x.x"
}
```

##### Example 2: Compatible Schema Version

Assume the content of /tmp/a.txt is hello world.

Input from LLM:

```json
{
  "schema_version": "1.2.3",
  "action": "read_file",
  "args": {
    "path": "/tmp/a.txt"
  }
}
```

Runtime output:
```json
{
  "status": "success",
  "action": "read_file",
  "result": {
    "content": "hello world\n"
  }
}
```

##### Example 3: Disallowed Action
Input from LLM:
```json
{
  "schema_version": "1.2.0",
  "action": "run_command",
  "args": {
    "command": "rm -rf /"
  }
}
```

Runtime output:
```json
{
  "error_code": "ACTION_NOT_ALLOWED",
  "message": "Generic command execution is not permitted in the core schema."
}
```

## Summary
- Schema versioning is strictly enforced
- MAJOR version mismatches are hard failures
- Dangerous actions are intentionally excluded
- The system prioritizes safety, verifiability, and scope control
