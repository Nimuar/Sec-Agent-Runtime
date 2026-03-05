import * as fs from 'fs';
import { AgentProposalSchema } from '../../sys-common/schemas/ProposalSchema';
import { dispatchAction } from './actions/dispatcher';
import { RuntimeResponse } from '../../sys-common/schemas/ExecutionContracts';

async function main() {
    let inputData = '';

    // Read all from stdin
    process.stdin.setEncoding('utf-8');
    for await (const chunk of process.stdin) {
        inputData += chunk;
    }

    inputData = inputData.trim();
    if (!inputData) {
        console.error("No input provided on STDIN.");
        process.exit(1);
    }

    let parsedJson: any;
    try {
        parsedJson = JSON.parse(inputData);
    } catch (e: any) {
        const errResp: RuntimeResponse = {
            proposal_id: "unknown",
            action: "UNKNOWN" as any,
            outcome: "VALIDATION_ERROR",
            result: null,
            error: {
                error_code: "INVALID_JSON",
                message: "Failed to parse JSON: " + e.message
            }
        };
        console.log(JSON.stringify(errResp));
        process.exit(0);
    }

    const validationResult = AgentProposalSchema.safeParse(parsedJson);

    if (!validationResult.success) {
        const errResp: RuntimeResponse = {
            proposal_id: parsedJson.id || "unknown",
            action: parsedJson.action || "UNKNOWN",
            outcome: "VALIDATION_ERROR",
            result: null,
            error: {
                error_code: "SCHEMA_VALIDATION_FAILED",
                message: "Invalid proposal format",
                details: validationResult.error.issues
            }
        };
        console.log(JSON.stringify(errResp));
        process.exit(0);
    }

    const proposal = validationResult.data;

    try {
        const response = await dispatchAction(proposal.id, proposal.action as any, proposal.args);
        console.log(JSON.stringify(response));
    } catch (e: any) {
        const errResp: RuntimeResponse = {
            proposal_id: proposal.id,
            action: proposal.action as any,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code: "EXECUTION_ERROR",
                message: "Dispatcher threw an error: " + e.message
            }
        };
        // The Constitution says dispatcher must not throw raw Node.js errors but catch them,
        // so this try/catch is a final fallback just in case.
        console.log(JSON.stringify(errResp));
    }
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
