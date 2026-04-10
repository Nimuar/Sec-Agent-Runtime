import * as fs from 'fs/promises';
import * as path from 'path';
import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { ExecutionPrimitive, ReadFileArgs, RuntimeResponse } from '../schemas/ExecutionContracts.js';

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

        const SANDBOX_DIR = path.join(import.meta.dirname, '../../sandbox');
        const physicalPath = path.join(SANDBOX_DIR, args.path.slice('/sandbox/'.length));
        const content = await fs.readFile(physicalPath, 'utf-8');

        return {
            proposal_id,
            action: ActionType.READ_FILE,
            outcome: "SUCCESS",
            result: { content },
            error: null
        };
    } catch (err: any) {
        const error_code =
            err.code === "ENOENT"    ? "FILE_NOT_FOUND" :
            err.code === "EISDIR"    ? "IS_DIRECTORY"   :
            err.code === "EACCES"    ? "PERMISSION_DENIED" :
            "UNKNOWN_ERROR";

        return {
            proposal_id,
            action: ActionType.READ_FILE,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: { error_code, message: err.message || String(err) }
        };
    }
};
