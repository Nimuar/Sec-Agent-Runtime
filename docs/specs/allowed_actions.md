# Enumerated allowed action types

### Task: Enumerated allowed action types
    - Description: Defines the complete set of action categories an agent is permitted to request. Forms the semantic surface of agent intent.
    - Responsibilities: Identify action categories and document the intent of each
    - Outputs: Action type registry
    - Acceptance Criteria: All proposals reference known action types
    - Pitfalls: Overbroad categories weaken policy enforcement

### Proposal:

There are two methods of creating an allowlist for securing untrusted LLMs, blacklisting and whitelisting. 

- Blacklisting: This method is a negative security model. The LLM is allowed to execute all actions by default unless explicitly enumerated in the blacklist. Due to the action-permissive nature of this approach, along with the unlimited number of actions that need to be brainstormed and added to the blacklist, this method is prone to vulnerabilities when executing processes without human
intervetion (human in the middle).
- Whitelisting: This method is a positive security model. The LLM is denied all actions by default unless explicitly 
enumerated in the whitelist. Due to the restrictiveness of the approach, this method is less prone to vulnerabilities when
an LLM is executing processes without human intervention.

Decision: The project will implement the whitelist method

The end goal of the whitelist is to ensure the LLM can only invoke the following actions. All actions must occur inside the ```/sandbox/``` directory.

Allowed actions:
- THINK - LLM though processing. Necessary action for the LLM to function.
- FINISH - Signal task is complete. Necessary action for the LLM to function.
- READ_FILE: Access, read file. Allowed strictly within the scope of a ```/sandbox/``` directory
- WRITE_FILE: Create, update file. Allowed strictly within the scope of a ```/sandbox/``` directory, and file extensions ```.txt``` and ```.md```.
- DELETE_FILE: Permanently remove a file. Restricted to ```/sandbox/``` and safe extensions ```.txt``` and ```.md``` to prevent the deletion of system binaries or protected resources.
- RENAME_FILE: Move or rename a file. Both source and destination must be within ```/sandbox/```. The destination extension is strictly limited to .txt and .md to prevent file type transformations.
- LIST_FILES: Enumerate the contents of a directory. Allowed strictly within the ```/sandbox/``` scope to allow the agent to orient itself.
- CREATE_DIRECTORY: Create a new folder. Allowed strictly within the ```/sandbox/``` scope

Rationale: For the purposes of the project, keeping in mind the development, testing, and integration work needed, the  whitelist above allows us to verify that our security process is effective while avoiding scope-creeping the project.

#### Development milestones:

We will schedule our prototypes in the following manner:

##### Prototype v1, Read operations:

Goal: Verify that the parser handles the following actions, and denies all other requests.

Allowed actions:
- THINK
- FINISH
- READ_FILE
- WRITE_FILE

##### prototype v2, Read/Write operations:

Goal: Verify that the parser handles the following actions, and denies all other requests.

Allowed actions:
- THINK
- FINISH
- READ_FILE
- WRITE_FILE
- DELETE_FILE
- RENAME_FILE
- LIST_FILES 
- CREATE_DIRECTORY

##### prototype v3, stress testing:

Goal: Stress-test the runtime by attempting forbidden actions to confirm the policy holds under load. 

Allowed actions:
- THINK
- FINISH
- READ_FILE
- WRITE_FILE
- DELETE_FILE
- RENAME_FILE
- LIST_FILES 
- CREATE_DIRECTORY

Possible Stress Tests, Expectation is for these to be denied:
- CURL
- NETWORK_CONNECT
- EXECUTE_CODE