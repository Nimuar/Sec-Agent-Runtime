import * as fs from 'fs/promises';
import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { ExecutionPrimitive, RuntimeResponse, WriteFileArgs } from '../schemas/ExecutionContracts.js';
import { resolveSandboxPath, mapFsErrorCode } from './sandboxPath.js';

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

        const physicalPath = resolveSandboxPath(args.path);
        await fs.writeFile(physicalPath, args.content);

        return {
            proposal_id,
            action: ActionType.WRITE_FILE,
            outcome: "SUCCESS",
            result: null,
            error: null
        };
    } catch (err: any) {
        return {
            proposal_id,
            action: ActionType.WRITE_FILE,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code: mapFsErrorCode(err),
                message: err.message || String(err)
            }
        };
    }
};
