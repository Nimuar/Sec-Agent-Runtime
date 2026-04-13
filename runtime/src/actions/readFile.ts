import * as fs from 'fs/promises';
import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { ExecutionPrimitive, ReadFileArgs, RuntimeResponse } from '../schemas/ExecutionContracts.js';
import { resolveSandboxPath, mapFsErrorCode } from './sandboxPath.js';

export const readFile: ExecutionPrimitive<ReadFileArgs> = async (
    proposal_id: string,
    args: ReadFileArgs
): Promise<RuntimeResponse> => {
    try {
        if (!args.path.startsWith('/sandbox/')) {
            return {
                proposal_id,
                action: ActionType.READ_FILE,
                outcome: "DENIED",
                result: null,
                error: {
                    error_code: "POLICY_VIOLATION",
                    message: "Path must start with /sandbox/"
                }
            };
        }

        const physicalPath = resolveSandboxPath(args.path);
        const content = await fs.readFile(physicalPath, 'utf-8');

        return {
            proposal_id,
            action: ActionType.READ_FILE,
            outcome: "SUCCESS",
            result: { content },
            error: null
        };
    } catch (err: any) {
        // readFile semantically returns FILE_NOT_FOUND for ENOENT (not PATH_NOT_FOUND)
        const error_code = err.code === "ENOENT" ? "FILE_NOT_FOUND" : mapFsErrorCode(err);

        return {
            proposal_id,
            action: ActionType.READ_FILE,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: { error_code, message: err.message || String(err) }
        };
    }
};
