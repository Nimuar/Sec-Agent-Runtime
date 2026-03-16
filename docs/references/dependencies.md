# Project Dependencies

This project relies on a minimal set of high-quality libraries to ensure strict validation and type safety without bloating the runtime.

## Runtime Dependencies
*Libraries required for the application to run in production.*

- **[zod](https://zod.dev/)**: Used for strict schema validation of Agent Proposals and Responses. It allows us to define "Field Constraints" as code and enforce security policies (like blocking `.sh` files) at the type level.

## Development Dependencies
*Libraries used for building, testing, and type-checking.*

- **[typescript](https://www.typescriptlang.org/)**: The core language for the project.
- **[vitest](https://vitest.dev/)**: The test runner used to verify our security logic. It is compatible with TypeScript out of the box and requires zero configuration.
- **[@types/node](https://www.npmjs.com/package/@types/node)**: Provides type definitions for built-in Node.js modules (like `crypto` for UUID generation).

Installation Commands
If you need to install these from scratch, run the following:

1. Install Runtime Dependencies

```Bash
npm install zod
```

2. Install Dev Dependencies

```Bash
npm install -D typescript vitest @types/node
```

3. Ensure Zod dependencies are in the correct location

```bash
npm install zod --save-prod
```

## Python Dependencies (Agent SDK & Evaluation)
*Libraries required to run the Python Agent SDK and testing tools.*

- **[google-genai](https://pypi.org/project/google-genai/)**: The official Google GenAI SDK used to interact with Gemini models in the `AgentInterface`.
- **[requests](https://pypi.org/project/requests/)**: Used by the Python SDK to send HTTP requests to the runtime API.
- **[python-dotenv](https://pypi.org/project/python-dotenv/)**: Loads environment variables (like your `GOOGLE_API_KEY`) from a `.env` file.

Installation Command:
```bash
pip install google-genai requests python-dotenv
```