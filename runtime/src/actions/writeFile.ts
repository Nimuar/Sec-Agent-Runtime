import * as fs from 'fs/promises';
import { ExecutionPrimitive, WriteFileArgs, RuntimeResponse } from '../../../sys-common/schemas/ExecutionContracts';
import { ActionType } from '../../../sys-common/schemas/ActionTypeRegistry';

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

        await fs.writeFile(args.path, args.content);

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
                error_code: "EXECUTION_ERROR",
                message: err.message || String(err)
            }
        };
    }
};
