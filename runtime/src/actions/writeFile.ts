import * as fs from 'fs/promises';
import * as path from 'path';
import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { ExecutionPrimitive, RuntimeResponse, WriteFileArgs } from '../schemas/ExecutionContracts.js';

export const writeFile: ExecutionPrimitive<WriteFileArgs> = async (
    proposal_id: string,
    args: WriteFileArgs
): Promise<RuntimeResponse> => {
    try {
        if (!args.path.startsWith('/sandbox/')) {
            return {
                proposal_id,
                action: ActionType.WRITE_FILE,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Path must start with /sandbox/" }
            };
        }

        if (!args.path.endsWith('.txt') && !args.path.endsWith('.md')) {
            return {
                proposal_id,
                action: ActionType.WRITE_FILE,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Only .txt and .md files are allowed" }
            };
        }

        const SANDBOX_DIR = path.join(import.meta.dirname, '../../sandbox');
        const physicalPath = path.join(SANDBOX_DIR, args.path.slice('/sandbox/'.length));
        await fs.writeFile(physicalPath, args.content);

        return {
            proposal_id,
            action: ActionType.WRITE_FILE,
            outcome: "SUCCESS",
            result: null,
            error: null
        };
    } catch (err: any) {
        const error_code =
            err.code === "ENOENT"    ? "PATH_NOT_FOUND" :
            err.code === "EISDIR"    ? "IS_DIRECTORY" :
            err.code === "EACCES"    ? "PERMISSION_DENIED" :
            "UNKNOWN_ERROR";

        return {
            proposal_id,
            action: ActionType.WRITE_FILE,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code,
                message: err.message || String(err)
            }
        };
    }
};
