# Testing the Sec-Agent Runtime

The Sec-Agent Runtime uses a multi-layered testing strategy to ensure security, statelessness, and robustness.

## 1. Unit & Integration Testing (Node.js)

The core runtime logic and API boundary are tested using **Vitest**. These tests cover schema validation, path normalization, and deterministic error mapping.

### Running Node.js Tests
```bash
npm run test
```

---

## 2. Robustness & Boundary Testing (Python)

Robustness tests, including boundary condition checks, fuzzing, and Slow-Loris resilience, are implemented in Python. These tests interact with the running Express server via the `RuntimeClient`.

### Prerequisite: Start the Server
The Express microservice must be running in a separate terminal before executing Python E2E tests:

```bash
# In Terminal 1
npx tsx api/src/server.ts
```

### Running the Python Tests
Once the server is listening on `localhost:3000`, run the boundary and robustness suite:

```bash
# In Terminal 2
python -m unittest tests/test_boundary.py
python -m unittest tests/test_fuzzing.py
python -m unittest tests/test_slow_loris.py
```

---

## 3. Test Coverage Areas
- **Schema Validation**: Deep nesting, oversized payloads, and malformed JSON.
- **Security Boundaries**: Directory traversal, Windows-specific path bypasses (ADS, Reserved Names), and null-byte injections.
- **Statelessness**: Verification of UUID-based tracing and atomic step handling.
- **Resilience**: Handling of stalled action execution and random binary noise.
