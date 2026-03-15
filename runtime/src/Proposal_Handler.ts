import { keyof } from "zod";
import * as config from "../../sys-common/schemas/ProposalErrorConfig.js";
import {ProposalErrorCode} from "../../sys-common/schemas/ProposalErrorRegistry.js";
import { GateError } from "../../sys-common/schemas/ProposalErrorSchema.js";
import { AgentProposal } from "../../sys-common/schemas/ProposalSchema.js";
import * as fs from "fs";
import * as fsPromises from 'fs/promises';
import { dirname } from 'path';
//Proposal Error handling logic for incoming proposals. As of now it simply defines the proposal type and logs it.
//This should be done in Typescript PascalCase for better readability and maintainability.

type proposal_type = AgentProposal;

//Eventually we want to return the error to the LLM, and Log it. FOr now it just returns it. 
export function ValidateProposal(proposal: proposal_type ) {
    // Check for null byte characters
    const nullByteError = ValidateNullByte(proposal);
    if (nullByteError) {
        LogError(nullByteError); 
        return nullByteError;
    }

    // Check for valid ASCII characters
    const asciiError = ValidateASCII(proposal);
    if (asciiError) {
        LogError(asciiError);
        return asciiError;
    }

    // Check for payload size
    const payloadError = validatePayloadSize(proposal);
    if (payloadError) {
        LogError(payloadError);
        return payloadError;
    }

    // Check for ID Collision
    const idCollisionError = ValidateIDCollision(proposal);
    if (idCollisionError) {
        LogError(idCollisionError);
        return idCollisionError;
    }
   // const CoreStructure = ValidateCoreStructure(proposal);
    // if (CoreStructure) {
    //     LogError(CoreStructure);
    //     return CoreStructure;
    // }
    LogID(proposal.id);
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


//WIP```````````````````````````````````````````````````````````````
  function ValidateIDCollision (proposal: proposal_type) {
    // Load previously seen IDs from the ID log
    let lines: string[] = [];
    
    try {
        const data =   fs.readFileSync(config.ID_LOG_PATH, 'utf-8');
        lines = data.split("\n");


    } catch (err) {

        console.log("ID Log Error: ", err);
        // Log file missing or unreadable — treat as empty backlog
    }

    const proposal_id = proposal.id;
    if (lines.includes(proposal_id)) {
        let error : GateError = {
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: ProposalErrorCode.ID_COLLISION,
            args: {
                incoming: proposal.id,
                message: "ID matches with previously logged proposal ID"
            }
        };
        return error;
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


//Logs the Error, no need for schema now.
async function LogError(error:GateError) {
    //Creates Timstamp for Log Entry and finds ErrorID


    const TimeStamp = new Date().toISOString();
    //Constructs Log Entry Object
    const LogEntry = {
        log_schema_version: config.log_schema_version,
        severity:config.LogSeverity.LOW,
        timestamp: TimeStamp,
        args: {
             message: `Error ID: ${error.id} | Log found in: ${config.ERROR_LOG_PATH}`,
             error: error
        }
     };


    //Append Log Entry to Log File
    try {
        if (config.ERROR_LOG_PATH === "") {
        await fsPromises.mkdir(dirname(config.ERROR_LOG_PATH), { recursive: true });
         }
        await fsPromises.appendFile(config.ERROR_LOG_PATH, JSON.stringify(LogEntry) + "\n");
    } catch (err) {
        console.error("Failed to log error:", err);
    }
}


async function LogID(proposal_id:string) {

    // No collision — record this ID so future proposals can be checked against it
    try {
        if (config.ERROR_LOG_PATH === "") {
            await fsPromises.mkdir(dirname(config.ERROR_LOG_PATH), { recursive: true });
         }
            await fsPromises.appendFile(config.ERROR_LOG_PATH, JSON.stringify({ id: proposal_id }) + "\n");
    } catch (err) {
        console.error("Failed to write to ID log:", err);
    }
}
