import * as fs from 'fs/promises';
import { ExecutionPrimitive, ReadFileArgs, RuntimeResponse } from '../../../sys-common/schemas/ExecutionContracts';
import { ActionType } from '../../../sys-common/schemas/ActionTypeRegistry';

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

        const content = await fs.readFile(args.path, 'utf-8');

        return {
            proposal_id,
            action: ActionType.READ_FILE,
            outcome: "SUCCESS",
            result: { content },
            error: null
        };
    } catch (err: any) {
        return {
            proposal_id,
            action: ActionType.READ_FILE,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code: "EXECUTION_ERROR",
                message: err.message || String(err)
            }
        };
    }
};
