import { ActionType } from "./ActionTypeRegistry";

// 2. The 3 possible execution outcomes
export type RequestOutcome = "SUCCESS" | "DENIED" | "EXECUTION_ERROR";

// Read Operations
export interface ReadFileArgs {
    path: string;
}

export interface ListFilesArgs {
    path: string;
}

// Write Operations
export interface WriteFileArgs {
    path: string;
    content: string; // Guaranteed min length 1
}

export interface CreateDirectoryArgs {
    path: string;
}

// Destructive Operations
export interface DeleteFileArgs {
    path: string;
}

export interface RenameFileArgs {
    source: string;
    destination: string;
}

// Meta Operations
export interface ThinkArgs { }

export interface FinishArgs {
    response: string;
}

export interface ExecutionError {
    error_code: string; // e.g., "FILE_NOT_FOUND", "ACCESS_DENIED", "POLICY_VIOLATION"
    message: string;
}

export interface RuntimeResponse {
    proposal_id: string; // Guaranteed UUID
    action: ActionType;
    outcome: RequestOutcome;
    result: Record<string, any> | null;
    error: ExecutionError | null;
}

/**
 * Blueprint for all Node.js file system wrappers.
 * @param proposal_id - The UUID for audit logging
 * @param args - The strongly-typed, Zod-validated arguments
 * @returns A deterministic RuntimeResponse payload
 */
export type ExecutionPrimitive<T> = (
    proposal_id: string,
    args: T
) => Promise<RuntimeResponse>;