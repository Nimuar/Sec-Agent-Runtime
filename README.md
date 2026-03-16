# A Security-Constrained Agent Runtime

This repository contains the **Agent Runtime**: a security-constrained execution environment that deterministically mediates between a Large Language Model (LLM) and real-world tools.

The runtime enforces safety and correctness through two core mechanisms:
1. **Explicit policy enforcement** over agent actions
2. **Systematic verification hooks** that enable analysis, auditing, and replay

The runtime is designed to act as a strict boundary between untrusted agent intent and trusted system execution.

<br/>

---

---

## Testing

The Agent Runtime employs a multi-layered verification suite. For full details on testing strategy and execution, see [the testing documentation](/docs/references/testing.md).

### Quick Start: Running Tests

#### Node.js Unit & Integration Tests
```bash
npm run test
```

#### Robustness & Boundary Tests (Python)
**Requirement:** The server must be running in a separate terminal.
```bash
# Terminal 1: Start Server
cd runtime && npm run dev

# Terminal 2: Run Tests
python -m unittest tests/test_boundary.py
python -m pytest tests/test_sdk_e2e.py -v
```

<br/>

---

## Repository Structure

The project is consolidated into a unified runtime and e2e testing suite:

- `/docs`: Documentation and specifications.
    - `/specs`: System contracts, allowed actions, and lifecycles.
    - `/references`: Test documentation, dependencies, and architectural guides.
- `/runtime`: The core Node.js application.
    - `/src/actions`: Definitions of allowed actions.
    - `/src/schemas`: Shared Zod schemas and TypeScript types.
    - `/src/server.ts`: Express API interface.
    - `/src/stepRuntime.ts`: Core lifecycle execution logic.
    - `/agent_sdk/`: Python-based LLM client for adversarial testing.
- `/tests`: Top-level E2E and robustness stress-testing suite (Python).
- `/logs`: Execution traces and test result outputs.

### SARE — Secure Agent Runtime Evaluations
Evaluation, simulation, and analysis tooling for the Agent Runtime live in a **separate repository**.

SARE provides:
- adversarial and malformed proposal testing
- multi-agent and conflict simulations
- performance benchmarking
- structured log ingestion, metrics, and reporting

The separation keeps the runtime implementation clean while allowing evaluation tooling to evolve independently.

➡️ **SARE repository:**  
*https://github.com/Collaborative-SWE-at-Purdue/Sec-Agent-Runtime*

<br/>

---

## Collaborative SWE @ Purdue — Shared Repository Hosting

Student-run software engineering projects developed as part of coursework at Purdue University.

In addition to industry-standard software engineering practices, these projects emphasize:
- clear architectural boundaries,
- explicit responsibility ownership,
- and meaningful collaboration between developers.

<br/>

**This organization is used to host team-based academic projects and is not an official Purdue University organization.**

<br/>

---

### **Agent Runtime Team | ECE 50874 / ECE 595 — Spring 2026**

| **Developer**                   | **GitHub Username** | **LinkedIn Profile**                                      |
|---------------------------------|---------------------|-------------------------------------------------------------|
| Dorian Bell II                  | BellJrDev           | https://www.linkedin.com/in/belljrdev/                      |
| Kevin Rivera                    | Nimuar              | https://www.linkedin.com/in/krivera53/                      |
| Evan Berendt                    | epbehren3           | https://www.linkedin.com/in/evan-behrendt-7a0046152/        |
| Ting-Chia Liu                   | Lucy0918            | https://www.linkedin.com/in/tingchia-liu/                   |
