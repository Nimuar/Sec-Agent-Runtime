/**
 * Standard error codes for agent proposals and execution outcomes.
 */
export enum ProposalErrorCode {
    // Schema & Versioning
    INVALID_JSON = "INVALID_JSON",
    SCHEMA_VERSION_INCOMPATIBLE = "SCHEMA_VERSION_INCOMPATIBLE",
    VALIDATION_ERROR = "VALIDATION_ERROR",

    // Policy & Authorization
    ACTION_NOT_ALLOWED = "ACTION_NOT_ALLOWED",
    POLICY_VIOLATION = "POLICY_VIOLATION",

    // Execution
    EXECUTION_ERROR = "EXECUTION_ERROR",
    FILE_NOT_FOUND = "FILE_NOT_FOUND",

    // Existing / Legacy
    NULL_BYTE = "NULL_BYTE",
    INVALID_ASCII = "INVALID_ASCII",
    PAYLOAD_OVERFLOW = "PAYLOAD_OVERFLOW",
    ID_COLLISION = "ID_COLLISION",
    INVALID_CONTENT = "INVALID_CONTENT",
    MISSING_CONTENT = "MISSING_CONTENT",
}
