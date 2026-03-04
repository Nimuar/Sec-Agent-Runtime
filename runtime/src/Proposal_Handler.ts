import * as z from "zod";
import * as config from "../../sys-common/schemas/ProposalErrorConfig.js";
import { GateList } from "../../sys-common/schemas/ProposalErrorSchema.js";
import {AgentProposalSchema} from "../../sys-common/schemas/ProposalSchema.js"
import * as fs from 'fs'; // Import the Node.js File System module

//Proposal Error handling logic for incoming proposals. As of now it simply defines the proposal type and logs it. 
//This should be done in Typescript PascalCase for better readability and maintainability.

//Eventually we want to return the error to the LLM, and Log it. FOr now it just returns it. 
export function ValidateProposal(proposal: string) {
    // Check for null byte characters

    const nullByteError = ValidateNullByte(proposal);
    if (nullByteError) {
        //This is so sloppy please fix. 
        let stringifiedError = JSON.stringify(nullByteError);
        LogError(stringifiedError);
        return nullByteError;
    }

    // Check for valid ASCII characters
    const asciiError = ValidateASCII(proposal);
    if (asciiError) {
        let stringifiedError = JSON.stringify(asciiError);
        LogError(stringifiedError);
        return asciiError;
    }

    // Check for payload size
    const payloadError = validatePayloadSize(proposal);
    if (payloadError) {
        let stringifiedError = JSON.stringify(payloadError);
        LogError(stringifiedError);
        return payloadError;
    }
    
    // Check for ID Collision
    const idCollisionError = ValidateIDCollision(proposal);
    if (idCollisionError) {
        let stringifiedError = JSON.stringify(idCollisionError);
        LogError(stringifiedError);
        return idCollisionError;
    }

    
};
    
    
    
function ValidateNullByte(proposal: string) {  
    if (proposal.includes("\0")) {
        return { 
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: config.filter.NULL_BYTE,
            args: {
                message: "Cannot contain null byte characters"
            }
        };
    }
 };
    // Check for valid ASCII characters
function ValidateASCII(proposal: string) {
    if (!config.valid_ascii.test(proposal)) {
        return { 
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: config.filter.INVALID_ASCII,
            args: {
                message: "Cannot contain invalid ASCII characters"
            }
        }
        
    }
};
// Check for payload size
function validatePayloadSize(proposal: string) {
    //Convert Proposal to bytes
    const ProposalByteSize = (str:string) => new TextEncoder().encode(str).length;
    //Check if proposal exceeds limit
    if (ProposalByteSize(proposal) > config.proposal_limit ) {
        return { 
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: config.filter.PAYLOAD_OVERFLOW,
            args: {
                size: ProposalByteSize(proposal),
                limit: 1024,
                message: "Payload exceeds maximum size of 1024 characters"
                }
        }
    }
};

//Check for ID Collision
//WIP to check proposal ID against backlog. 
/*Right now I will just have it check an empty file, 
but eventually this should be checking against a 
database/logfile of logged proposal IDs.*/

function ValidateIDCollision (proposal: string) {
    const backlogIDs: string[] = [config.TEST_UUID]; // This should be replaced with actual backlog data source
    const proposal_data = JSON.parse(proposal).id;
    if (backlogIDs.includes(proposal_data)) {

        return { 
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: config.filter.ID_COLLISION,
            args: {
                incoming: proposal,
                message: "ID matches with previously logged proposal ID"
            }
        }
    }
};



//Check for invalid strucure.

function ValidateCoreStructure(proposal:string) {
    //Missing Fields Check - Our Schema is only comprised of strings and numbers ATP.
    const missing_fields: (string | number) [] = []
    //Grab correct reference schema and parse proposal 
    const ParsedProposal = JSON.parse(proposal);
    const ReferenceSchema = AgentProposalSchema.options.find(schema => schema.shape.action === ParsedProposal.action);
    const ParsedRef  =  ReferenceSchema?.shape;


    //Reference Incoming Proposal against Correct Schema for missing units. 
    for (const key in ParsedRef) {
        if (ParsedProposal[key] === undefined || ParsedProposal[key] === null || ParsedProposal[key] === "" ) {
            missing_fields.push(key);
        }
    }



    //If there are 1 or more missing fields, return error response with list of missing fields.
    if (missing_fields.length > 0) {
        const missing_string = missing_fields.join(", ");
        return { 
            schema_version: config.schema_version,
            id: crypto.randomUUID(),
            input: proposal,
            ErrorId: config.filter.MISSING_CONTENT,
            args: {
                fields: missing_string,
                message: "Required field is missing or empty"
            }
        }

    }

}


//Logs the Error, no need for schema now.
function LogError(error:string) {
    //Creates Timstamp for Log Entry and finds ErrorID
    const TimeStamp = new Date().toISOString();
    const ErrorType = JSON.parse(error).id || "UNKNOWN_ERROR_ID";

    //Constructs Log Entry Object
    const LogEntry = {
        log_schema_version: config.log_schema_version,
        severity:config.LogSeverity.LOW,
        timestamp: TimeStamp,
        args: {
             message: `Error ID: ${ErrorType} | Log found in: ${config.ERROR_LOG_PATH}`,
             error: error
        }
     };


    //Append Log Entry to Log File
    try {
        fs.appendFileSync(config.ERROR_LOG_PATH, JSON.stringify(LogEntry) + "\n");
    } catch (err) {
        console.error("Failed to log error:", err);
    }
}


