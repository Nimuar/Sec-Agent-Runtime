## Step Determinism Rules
### Overview

Step determinism ensures that each step in the runtime produces consistent and reproducible results.

Given the same proposal, policy, and filesystem state, the runtime MUST always produce the same outcome.

Determinism applies to the entire step execution, including validation, authorization, execution, and response generation.

To support replay, debugging, and auditing, the following MUST remain invariant:

- validation outcome  
- authorization decision  
- execution outcome (SUCCESS / DENIED / ERROR)  
- error codes  
- response structure  

Non-deterministic data (e.g., timestamps or logs) may exist, but MUST NOT affect any decisions.

### Deterministic Invariants

For a step to be replayable, the following MUST remain invariant.

In other words, given the same inputs and environment, these elements must not change.

- **validation outcome** — validation must always produce the same result  
- **authorization decision** — policy checks must be consistent  
- **execution outcome** — final result must not change  
- **error codes** — failures must map to the same error type  
- **response structure** — response schema must be identical  
- **response values** — content must be identical (excluding timestamps or logs)

---

### Determinism Rules

#### Rule 1 — No Hidden Inputs
Decisions must depend only on:
- proposal (action, args)
- policy configuration
- filesystem state

They must not be influenced by:
- time
- randomness
- external systems

#### Rule 2 — Reasoning is Audit-Only
The `reasoning` field is for logging only and must not affect:
- validation
- authorization
- execution

#### Rule 3 — Deterministic Validation
Validation must produce consistent results.  
Invalid inputs always result in `VALIDATION_ERROR`.

#### Rule 4 — Deterministic Authorization
Authorization decisions must be consistent.  
Disallowed actions or policy violations always result in `DENIED`.

#### Rule 5 — No Auto-Fix
The runtime must not modify or correct the proposal.  
Invalid inputs must not be automatically fixed.

#### Rule 6 — Stable Error Classification
Each failure type maps to a fixed error category:

- validation → VALIDATION_ERROR  
- policy → DENIED  
- execution → EXECUTION_ERROR  

---

### Phase-Level Determinism

Determinism must hold across all lifecycle phases:

RECEIVE → PARSE → VALIDATE → AUTHORIZE → EXECUTE → RECORD → RESPOND

Each phase must produce consistent results under identical inputs and environment.
