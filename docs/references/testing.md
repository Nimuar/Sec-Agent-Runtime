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
cd runtime && npm run dev
```

### Running the Python Tests
Once the server is listening on `localhost:3000`, run the boundary and robustness suite:

```bash
# In Terminal 2
python -m unittest tests/test_boundary.py
python -m unittest tests/test_fuzzing.py
python -m unittest tests/test_slow_loris.py
python -m pytest tests/test_sdk_e2e.py -v
```

## 3. Manual Agent SDK Testing

If you want to manually test the agent integration via the SDK (`agent_test.py`), you need to run the development server and then execute the Python script.

### Start the Server
Run the API's development server in one terminal:
```bash
# In Terminal 1 (from the root directory)
cd runtime
npm run dev
```

### Run the Agent SDK Test
In a separate terminal, navigate to the SDK folder and run the test script:
```bash
# In Terminal 2
cd runtime/agent_sdk
python ./agent_test.py
```

---

## 3. Test Coverage Areas
- **Schema Validation**: Deep nesting, oversized payloads, and malformed JSON.
- **Security Boundaries**: Directory traversal, Windows-specific path bypasses (ADS, Reserved Names), and null-byte injections.
- **Statelessness**: Verification of UUID-based tracing and atomic step handling.
- **Resilience**: Handling of stalled action execution and random binary noise.
