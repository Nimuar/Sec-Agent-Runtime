from agent import AgentInterface
import AgentConfig
import os
import json


def main():
    # Define the initial agent.
    agent = AgentInterface()

    # Grab initial proposal
    directory = os.path.dirname(__file__)
    with open(os.path.join(directory, "prompts", "fuzz_prompt.txt"), "r") as file:
        proposal = file.read()

    # Feed it into LLM.
    response = agent.agentprompt(proposal)

    if isinstance(response, dict) and response.get("outcome") == "EXECUTION_ERROR":
        print(f"Agent returned error: {response}")
        agent.close()
        return

    # response = AgentConfig.sample_proposals[0] #For testing, use the first sample proposal.
    while agent.active:

        if not response or not isinstance(response, dict) or "proposal" not in response:
            print(f"Invalid Response structure: {response}. Closing Agent.")
            agent.close()
            break

        print("Proposal sent to agent:", response)

        print(f"Response: {response}")
        # Send output into TS server.
        ts_response = agent.reqhttp(response["proposal"])

        # Print output from TS server.
        print(f"TS Server Response: {ts_response}")

        # Ensure we actually got a response before checking the outcome
        if ts_response is None:
            print(
                "Fatal: Could not connect to the Express server. Is it running on port 3000?"
            )
            agent.close()
            break

        # Currently gives claude changes to try again, can easily cancel this if need be.
        if ts_response.get("outcome") == "VALIDATION_ERROR":
            print("Task validation error. Please Retry.")
            if len(agent.proposal_history) >= agent.max_retries:
                print("Maximum retries reached. Closing agent.")
                agent.close()
            else:
                feedback = json.dumps(ts_response)
                response = agent.agentprompt(feedback)
        elif ts_response.get("outcome") == "SUCCESS":
            print("Task completed successfully. Closing agent.")
            agent.close()
        else:
            print(
                f"Task ended with outcome: {ts_response.get('outcome')}. Closing agent."
            )
            agent.close()


if __name__ == "__main__":
    main()
