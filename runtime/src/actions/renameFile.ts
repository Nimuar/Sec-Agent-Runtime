import * as fs from 'fs/promises';
import * as path from 'path';
import { ExecutionPrimitive, RenameFileArgs, RuntimeResponse } from '../../../sys-common/schemas/ExecutionContracts';
import { ActionType } from '../../../sys-common/schemas/ActionTypeRegistry';

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

        const physicalSource = path.join(process.cwd(), 'local_sandbox', args.source.slice('/sandbox/'.length));
        const physicalDestination = path.join(process.cwd(), 'local_sandbox', args.destination.slice('/sandbox/'.length));
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
                error_code: "EXECUTION_ERROR",
                message: err.message || String(err)
            }
        };
    }
};
