import * as fs from 'fs/promises';
import * as path from 'path';
import { ExecutionPrimitive, DeleteFileArgs, RuntimeResponse } from '../../../sys-common/schemas/ExecutionContracts';
import { ActionType } from '../../../sys-common/schemas/ActionTypeRegistry';

export const deleteFile: ExecutionPrimitive<DeleteFileArgs> = async (
    proposal_id: string,
    args: DeleteFileArgs
): Promise<RuntimeResponse> => {
    try {
        if (!args.path.startsWith('/sandbox/')) {
            return {
                proposal_id,
                action: ActionType.DELETE_FILE,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Path must start with /sandbox/" }
            };
        }

        if (!args.path.endsWith('.txt') && !args.path.endsWith('.md')) {
            return {
                proposal_id,
                action: ActionType.DELETE_FILE,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Only .txt and .md files are allowed to be deleted" }
            };
        }

        const physicalPath = path.join(process.cwd(), 'local_sandbox', args.path.slice('/sandbox/'.length));
        await fs.unlink(physicalPath);

        return {
            proposal_id,
            action: ActionType.DELETE_FILE,
            outcome: "SUCCESS",
            result: null,
            error: null
        };
    } catch (err: any) {
        return {
            proposal_id,
            action: ActionType.DELETE_FILE,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code: "EXECUTION_ERROR",
                message: err.message || String(err)
            }
        };
    }
};
