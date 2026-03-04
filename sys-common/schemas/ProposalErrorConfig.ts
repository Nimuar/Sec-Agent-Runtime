//Proposal Error handling limits and configurations

export const schema_version = "1.0.0"; // Schema version for error responses
export const log_schema_version = "1.0.0"; // Schema version for error logs
export const valid_ascii = /^[ -~]*$/; // Regex for valid ASCII characters
export const proposal_limit = 1024; // 1KB limit for proposal size

export let ERROR_LOG_PATH = "../logs/proposals.error.log";
//For testing purposes only.
export let TEST_UUID = "00000000-0000-0000-0000-000000000000";



export enum filter {
 NULL_BYTE  = "NULL_BYTE",
 INVALID_ASCII = "INVALID ASCII",
 PAYLOAD_OVERFLOW = "PAYLOAD_OVERFLOW",
 ID_COLLISION = "ID_COLLISION",
 MISSING_CONTENT = "MISSING_CONTENT",
 VALIDATION_SUCCESS = "VALIDATION_SUCCESS"
}//error response types

export enum LogSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH"
}//log types for logging errors - Only Expounding on Simple Error log for now.
