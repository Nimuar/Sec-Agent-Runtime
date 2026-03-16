import * as fs from 'fs/promises';
import * as path from 'path';
import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { CreateDirectoryArgs, ExecutionPrimitive, RuntimeResponse } from '../schemas/ExecutionContracts.js';

export const createDir: ExecutionPrimitive<CreateDirectoryArgs> = async (
    proposal_id: string,
    args: CreateDirectoryArgs
): Promise<RuntimeResponse> => {
    try {
        if (!args.path.startsWith('/sandbox/')) {
            return {
                proposal_id,
                action: ActionType.CREATE_DIRECTORY,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Path must start with /sandbox/" }
            };
        }

        const physicalPath = path.join(process.cwd(), 'sandbox', args.path.slice('/sandbox/'.length));
        await fs.mkdir(physicalPath, { recursive: true });

        return {
            proposal_id,
            action: ActionType.CREATE_DIRECTORY,
            outcome: "SUCCESS",
            result: null,
            error: null
        };
    } catch (err: any) {
        return {
            proposal_id,
            action: ActionType.CREATE_DIRECTORY,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code: "EXECUTION_ERROR",
                message: err.message || String(err)
            }
        };
    }
};
