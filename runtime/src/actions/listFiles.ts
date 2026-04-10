import * as fs from 'fs/promises';
import { Dirent } from 'fs';
import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { ExecutionPrimitive, ListFilesArgs, RuntimeResponse } from '../schemas/ExecutionContracts.js';
import { resolveSandboxPath, mapFsErrorCode } from './sandboxPath.js';

export const listFiles: ExecutionPrimitive<ListFilesArgs> = async (
    proposal_id: string,
    args: ListFilesArgs
): Promise<RuntimeResponse> => {
    try {
        if (!args.path.startsWith('/sandbox/')) {
            return {
                proposal_id,
                action: ActionType.LIST_FILES,
                outcome: "DENIED",
                result: null,
                error: { error_code: "POLICY_VIOLATION", message: "Path must start with /sandbox/" }
            };
        }

        const physicalPath = resolveSandboxPath(args.path);
        const dirents = await fs.readdir(physicalPath, { withFileTypes: true });

        // Map Dirent arrays to serializable objects representing the directory tree structure or names
        const files = dirents.map((dirent: Dirent) => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            isFile: dirent.isFile()
        }));

        return {
            proposal_id,
            action: ActionType.LIST_FILES,
            outcome: "SUCCESS",
            result: { files },
            error: null
        };
    } catch (err: any) {
        return {
            proposal_id,
            action: ActionType.LIST_FILES,
            outcome: "EXECUTION_ERROR",
            result: null,
            error: {
                error_code: mapFsErrorCode(err),
                message: err.message || String(err)
            }
        };
    }
};
