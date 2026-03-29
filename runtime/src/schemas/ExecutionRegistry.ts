
import { ActionType } from "./ActionTypeRegistry.js";

//Execution error codes. 
export enum ExecutionErrorId {
    // Schema Validation
    PATH_MISSING = "PATH_MISSING",
    PATH_NOT_STRING = "PATH_NOT_STRING",
    PATH_OUT_OF_BOUNDS = "PATH_OUT_OF_BOUNDS",

    // Read & Inspection
    PATH_NOT_FOUND = "PATH_NOT_FOUND",
    IS_DIRECTORY = "IS_DIRECTORY",
    NOT_A_DIRECTORY = "NOT_A_DIRECTORY",

    // State Modification
    ALREADY_EXISTS = "ALREADY_EXISTS",
    DISK_FULL = "DISK_FULL",
    IO_ERROR = "IO_ERROR",

    // High-Risk Operations
    FILE_NOT_FOUND = "FILE_NOT_FOUND",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    TARGET_ALREADY_EXISTS = "TARGET_ALREADY_EXISTS",

    // Fallback
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export const enum ExecutionOutcome {
    RETRY  = "RETRY",   // Agent gave a correctable argument — prompt to fix, no quota cost
    ABORT  = "ABORT",   // System-level failure — session cannot continue
    PROMPT = "PROMPT",  // Stale world-model — deduct one error credit, prompt agent to reassess
}


// Errors whose outcome is the same regardless of which action raised them.
const OUTCOME_MAP: Record<ExecutionErrorId, ExecutionOutcome> = {
    [ExecutionErrorId.PATH_MISSING]:          ExecutionOutcome.RETRY,
    [ExecutionErrorId.PATH_NOT_STRING]:       ExecutionOutcome.RETRY,
    [ExecutionErrorId.PATH_OUT_OF_BOUNDS]:    ExecutionOutcome.RETRY,
    [ExecutionErrorId.IS_DIRECTORY]:          ExecutionOutcome.RETRY,
    [ExecutionErrorId.NOT_A_DIRECTORY]:       ExecutionOutcome.RETRY,
    [ExecutionErrorId.TARGET_ALREADY_EXISTS]: ExecutionOutcome.PROMPT,
    [ExecutionErrorId.ALREADY_EXISTS]:        ExecutionOutcome.PROMPT,
    [ExecutionErrorId.UNKNOWN_ERROR]:         ExecutionOutcome.PROMPT,
    [ExecutionErrorId.DISK_FULL]:             ExecutionOutcome.ABORT,
    [ExecutionErrorId.IO_ERROR]:              ExecutionOutcome.ABORT,
    [ExecutionErrorId.PERMISSION_DENIED]:     ExecutionOutcome.ABORT,

    // Ambiguous — resolved per-action below; default is PROMPT as a safe fallback
    [ExecutionErrorId.FILE_NOT_FOUND]:        ExecutionOutcome.PROMPT,
    [ExecutionErrorId.PATH_NOT_FOUND]:        ExecutionOutcome.PROMPT,
};


// Per-action overrides for errors whose meaning depends on which action raised them.
//
//   FILE_NOT_FOUND on READ_FILE  → agent guessed a wrong path       → RETRY
//   PATH_NOT_FOUND on LIST_FILES → agent gave a wrong directory path → RETRY
//   All other FILE_NOT_FOUND / PATH_NOT_FOUND cases fall through to DEFAULT_MAP (PROMPT).
export function GetExecutionOutcome(action: ActionType, errorId: ExecutionErrorId): string {
    if (action === ActionType.READ_FILE  && errorId === ExecutionErrorId.FILE_NOT_FOUND) return ExecutionOutcome.RETRY;
    if (action === ActionType.LIST_FILES && errorId === ExecutionErrorId.PATH_NOT_FOUND) return ExecutionOutcome.RETRY;
    return OUTCOME_MAP[errorId] || ExecutionOutcome.PROMPT; // Default to PROMPT for any unmapped errors
}
