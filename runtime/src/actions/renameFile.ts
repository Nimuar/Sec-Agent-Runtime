import * as fs from 'fs/promises';
import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { ExecutionPrimitive, RuntimeResponse, RenameFileArgs } from '../schemas/ExecutionContracts.js';
import { resolveSandboxPath, mapFsErrorCode } from './sandboxPath.js';

export const renameFile: ExecutionPrimitive<RenameFileArgs> = async (
    proposal_id: string,
    args: RenameFileArgs
): Promise<RuntimeResponse> => {
    try {
        if (!args.source.startsWith('/sandbox/')) {
            return {
                proposal_id,
                action: ActionType.RENAME_FILE,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Source path must start with /sandbox/" }
            };
        }

        if (!args.destination.startsWith('/sandbox/')) {
            return {
                proposal_id,
                action: ActionType.RENAME_FILE,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Destination path must start with /sandbox/" }
            };
        }

        if (!args.destination.endsWith('.txt') && !args.destination.endsWith('.md')) {
            return {
                proposal_id,
                action: ActionType.RENAME_FILE,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Destination file must be .txt or .md" }
            };
        }

        const physicalSource = resolveSandboxPath(args.source);
        const physicalDestination = resolveSandboxPath(args.destination);
        await fs.rename(physicalSource, physicalDestination);

        return {
            proposal_id,
            action: ActionType.RENAME_FILE,
            outcome: "SUCCESS",
            result: null,
            error: null
        };
    } catch (err: any) {
        return {
            proposal_id,
            action: ActionType.RENAME_FILE,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code: mapFsErrorCode(err),
                message: err.message || String(err)
            }
        };
    }
};
