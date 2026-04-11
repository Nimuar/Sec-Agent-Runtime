import { listeners } from "cluster";
import * as config from "./schemas/ProposalErrorConfig.js";
import { ProposalErrorCode } from "./schemas/ProposalErrorRegistry.js";
import { GateError } from "./schemas/ProposalErrorSchema.js";
import { AgentProposal } from "./schemas/ProposalSchema.js";
import * as fsPromises from 'fs/promises';
//Proposal Error handling logic for incoming proposals. As of now it simply defines the proposal type and logs it.
//This should be done in Typescript PascalCase for better readability and maintainability.

export type proposal_type = AgentProposal;

//Eventually we want to return the error to the LLM, and Log it. FOr now it just returns it.
export async function ValidateProposal(proposal: proposal_type ): Promise<GateError | undefined> {
    // Check for null byte characters
    const nullByteError = ValidateNullByte(proposal);
    if (nullByteError) return nullByteError;

    // Check for valid ASCII characters
    const asciiError = ValidateASCII(proposal);
    if (asciiError) return asciiError;

    // Check for payload size
    const payloadError = validatePayloadSize(proposal);
    if (payloadError) return payloadError;

    // Check for ID Collision (async — non-blocking read)
    const idCollisionError = await ValidateIDCollision(proposal);
    if (idCollisionError) return idCollisionError;
}
    
    
//Can be flattened and checked for null bytes, but this is more efficient and less error prone.
function ValidateNullByte(proposal: proposal_type): GateError | undefined {
    if (JSON.stringify(proposal).includes("\\u0000")) {
        return {
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: ProposalErrorCode.NULL_BYTE,
            args: {
                message: "Cannot contain null byte characters"
            }
        };
    }
}



//This function needs a nested loop to check because flattening this proposal will contain broken asciis. 

function ValidateASCII(proposal: proposal_type): GateError | undefined {
    for (const value of Object.values(proposal)) {
        if (typeof value === "string" && !config.valid_ascii.test(value)) {
            return {
                schema_version: config.schema_version,
                id: crypto.randomUUID(),
                input: proposal,
                ErrorId: ProposalErrorCode.INVALID_ASCII,
                args: {
                    message: "Cannot contain invalid ASCII characters"
                }
            };
        }
        if (typeof value === "object" && value !== null) {
            for (const nested of Object.values(value)) {
                if (typeof nested === "string" && !config.valid_ascii.test(nested)) {
                    return {
                        schema_version: config.schema_version,
                        id: crypto.randomUUID(),
                        input: proposal,
                        ErrorId: ProposalErrorCode.INVALID_ASCII,
                        args: {
                            message: "Cannot contain invalid ASCII characters"
                        }
                    };
                }
            }
        }
    }
}





    // Check for valid ASCII characters
// function ValidateASCII(proposal: proposal_type): GateError | undefined {
//     let response: GateError = {} as GateError;
//     for(const [key, value] of Object.entries(proposal)){
//         if (!config.valid_ascii.test(JSON.stringify(value))) {
//              return response = { 
//                 schema_version: config.schema_version,
//                 id: crypto.randomUUID(),
//                 input: proposal,
//                 ErrorId: ProposalErrorCode.INVALID_ASCII,
//                 args: {
//                     message: "Cannot contain invalid ASCII characters"
//                 }
//             };
//         if(typeof key === "object" && value !== null){
//             return ValidateASCII(value as proposal_type); // Recursively check nested objects
//         }
//     }

// }}



// Check for payload size
function validatePayloadSize(proposal: proposal_type) {
    //Convert Proposal to bytes
    const proposal_bytes = new TextEncoder().encode(JSON.stringify(proposal)).byteLength;

    //Check if proposal exceeds limit
    if ((proposal_bytes) > config.proposal_limit ) {
        let error : GateError = { 
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: ProposalErrorCode.PAYLOAD_OVERFLOW,
            args: {
                size: proposal_bytes,
                limit: 1024,
                message: "Payload exceeds maximum size of 1024 characters"
                }
        };
        return error;
    }
}

//Check for ID Collision
//WIP to check proposal ID against backlog. 
/*Right now I will just have it check an empty file, 
but eventually this should be checking against a 
database/logfile of logged proposal IDs.*/


async function ValidateIDCollision(proposal: proposal_type): Promise<GateError | undefined> {
    const seenIDs = new Set<string>();

    try {
        const files = await fsPromises.readdir(config.ID_LOG_PATH);
        for (const file of files.filter(f => f.endsWith('.jsonl'))) {
            const content = await fsPromises.readFile(`${config.ID_LOG_PATH}/${file}`, 'utf-8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    const record = JSON.parse(trimmed);
                    if (record.record_type === 'audit_event' && record.proposal_id) {
                        seenIDs.add(record.proposal_id);
                    }
                } catch {
                    // skip malformed lines
                }
            }
        }
    } catch (err) {
        console.log("ID Log Error: ", err);
        // Log directory missing or unreadable — treat as empty backlog
    }

    if (seenIDs.has(proposal.id)) {
        return {
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: ProposalErrorCode.ID_COLLISION,
            args: {
                incoming: proposal.id,
                message: "ID matches with previously logged proposal ID"
            }
        };
    }
}


//Commented out for now, replace with zod implementation.
// //Check for invalid strucure.

// function ValidateCoreStructure(proposal: proposal_type) {
//     //Missing Fields Check - Our Schema is only comprised of strings and numbers ATP.
//     //Right now it is only going to check to make sure fields are missing, initial schema checks for the other stuff
//     const missing_fields: string[] = []
    

    
//     for (const [key, value] of Object.entries(proposal)) {
//         if (value === undefined || value === null || value === "") {
//             missing_fields.push(key);
//         }
//     }

//     if (proposal.schema_version !== config.schema_version) {
//         missing_fields.push("schema_version");
//     }
//     //If there are 1 or more missing fields, return error response with list of missing fields.
//     if (missing_fields.length > 0) {
//         const missing_string = missing_fields.join(", ");
//         let error : GateError = {
//             schema_version: config.schema_version,
//             id: crypto.randomUUID(),
//             input: proposal,
//             ErrorId: ProposalErrorCode.MISSING_CONTENT,
//             args: {
//                 field: missing_string,
//                 message: "Required field is missing or incorrectly formatted"
//             }
//         }
//         return error;

//     }

// }


