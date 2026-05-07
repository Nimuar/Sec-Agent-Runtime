# A Security-Constrained Agent Runtime

This repository contains the **Agent Runtime**: a security-constrained execution environment that deterministically mediates between a single untrusted Python Large Language Model (LLM) agent and a trusted Node.js execution runtime. 

The runtime enforces safety and correctness through two core architectural mechanisms:
1. **Stateless Execution:** The runtime intentionally avoids maintaining complex session states, database transitions, or multi-client APIs to eliminate attack vectors and ensure each agent proposal is evaluated strictly on its own semantic merits.
2. **Static Policy Enforcement (Positive Security Model):** Rather than relying on dynamic, probabilistic AI guardrails, all actions are denied by default. Actions must adhere to strict, hardcoded JSON schemas validated via Zod. Only a strict allowlist of 8 explicitly defined actions are permitted, with destructive file operations constrained to `.txt` and `.md` files within the `/sandbox/` directory.

The runtime is designed to act as a strict boundary between untrusted agent intent and trusted system execution.

<br/>

---

## Evaluation & Results

Following integration of the evaluation tooling, the runtime was tested against an aggregate dataset of **364 agent interactions** (including 110 adversarial payloads) using Gemini 3.1 Flash Lite and Gemma 3 27B models. 

**Key Findings:**
* **0.0% False Negative Rate (FNR):** The system successfully intercepted 100% of malicious execution attempts (e.g., path traversal, arbitrary file writes).
* **94.3% False Positive Rate (FPR):** Demonstrating the "Structural-Semantic Gap," a vast majority of benign requests were denied due to the agent's failure to adhere strictly to the rigid Zod schema constraints. This highlights a critical trade-off between uncompromising security and operational utility.
* **9.4% System Fault Rate:** The runtime achieved deterministic stability after neutralizing an infrastructure race condition related to sandbox initialization.

<br/>

---

## Known Limitations

While the runtime successfully prevents unauthorized actions, there are several known limitations inherent to this Positive Security Model:
* **The "Entropy Sink" in Chained Tasks:** Because the execution environment is completely stateless, multi-step autonomous workflows are highly likely to encounter a schema violation and halt. This makes long-running autonomous tasks statistically difficult to complete without human intervention.
* **Defensive Gap (Indirect Prompt Injection):** The runtime secures the *host* from the *agent*, but does not sanitize the inputs the agent receives *from the host* (e.g., reading a compromised file). Thus, an agent's internal reasoning could still be compromised even if its outbound actions are contained.

<br/>

---

## Testing

The Agent Runtime employs a multi-layered verification suite. For full details on testing strategy and execution, see [the testing documentation](/docs/references/testing.md).

### Quick Start: Running Tests

#### Node.js Unit & Integration Tests
```bash
npm run test
```

#### Robustness, Boundary & Evaluation Tests (Python)
**Requirement:** The server must be running in a separate terminal.
```bash
# Terminal 1: Start Server
cd runtime && npm run dev

# Terminal 2: Run Tests
python -m pytest tests/ -v
# Run specific evaluations:
python -m unittest tests/test_boundary.py
python -m pytest tests/test_sdk_e2e.py -v
python -m pytest tests/test_fuzzing.py -v
```

<br/>

---

## Repository Structure

The project is consolidated into a unified runtime, evaluation pipeline, and e2e testing suite:

- `/docs`: Documentation and specifications.
    - `/specs`: System contracts, allowed actions, and lifecycles.
    - `/references`: Test documentation, dependencies, and architectural guides.
- `/runtime`: The core Node.js application.
    - `/src/actions`: Definitions of allowed actions.
    - `/src/schemas`: Shared Zod schemas and TypeScript types.
    - `/src/server.ts`: Express API interface.
    - `/src/stepRuntime.ts`: Core lifecycle execution logic.
    - `/agent_sdk/`: Python-based LLM client for adversarial testing.
- `/evaluation`: (SARE) Structured log ingestion, metric computation, and classification pipeline.
- `/tests`: Top-level E2E, adversarial fuzzing, and robustness stress-testing suite (Python).
- `/logs`: Execution traces and test result outputs.

### SARE — Secure Agent Runtime Evaluations
All evaluation, simulation, and analysis tooling for the Agent Runtime (SARE) is integrated directly into this repository within the `/evaluation` directory. 

SARE provides:
- adversarial and malformed proposal testing
- performance benchmarking
- structured log ingestion, metrics, and reporting

<br/>

---

## Project Methodology & Labor Attribution

In the spirit of Agentic Software Engineering, this project was developed using a hybrid human-AI methodology. The system demonstrates an approximately **35% Human / 65% LLM-assisted** labor split across 2,344 lines of code.

* **Human Engineering (35%):** 100% of the high-level architecture, security policy design, Zod schemas, and orchestrator boundaries.
* **LLM Assistance (65%):** Generation of implementation boilerplate, standard API endpoints, CI/CD Pipeline scripts, and adversarial test case fuzzing.

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
| Kevin Rivera                    | Nimuar              | https://www.linkedin.com/in/krivera53/                      |
| Evan Berendt                    | epbehren3           | https://www.linkedin.com/in/evan-behrendt-7a0046152/        |
| Ting-Chia Liu                   | Lucy0918            | https://www.linkedin.com/in/tingchia-liu/                   |

<br/>

---

### Technical Debt & Architectural Post-Mortem

This repository represents a functional V1 prototype developed under academic constraints. While the system successfully implements a **Positive Security Model** for autonomous agents, the following technical debt was intentionally deferred to meet the project deadline and is documented here for architectural transparency.

#### 1. Performance & Scalability: $O(N)$ ID Validation
* **The Debt:** The `ValidateIDCollision` function in `Proposal_Handler.ts` currently performs a sequential read and parse of all historical `.jsonl` audit logs on every incoming request to check for ID collisions.
* **The Impact:** System latency scales linearly with the history of the system. This is a risk that will eventually cause execution timeouts in a high-frequency production environment.

#### 2. Security: Shallow Payload Validation
* **The Debt:** The `ValidateASCII` logic in `Proposal_Handler.ts` utilizes a nested loop that only validates the first two levels of the JSON proposal. 
* **The Impact:** A malicious or hallucinating agent can bypass security gates by nesting payloads deeper than two levels (e.g., `args.metadata.nested_payload`). 

#### 3. Reliability: Ephemeral State Management
* **The Debt:** Agent quotas and session tracking are managed via an in-memory `Map` in `server.ts`.
* **The Impact:** The system lacks resilience. A server restart resets all agent burn rates, allowing for scenarios where an agent can bypass its credit limit by triggering a service recycle.

#### 4. Architecture: Policy vs. Enforcement Boundary
* **The Debt:** The system relies on logical decoupling between the SDK and the Runtime. 
* **The Impact:** Without OS-level enforcement (e.g., cgroups, namespaces, or Docker-in-Docker isolation), the security boundary is purely cooperative. An untrusted SDK process with host-level permissions could theoretically bypass the Runtime mediation layer entirely.
