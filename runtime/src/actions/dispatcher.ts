import { ActionType } from '../../../sys-common/schemas/ActionTypeRegistry';
import { RuntimeResponse } from '../../../sys-common/schemas/ExecutionContracts';

import { readFile } from './readFile';
import { writeFile } from './writeFile';
import { deleteFile } from './deleteFile';
import { renameFile } from './renameFile';
import { listFiles } from './listFiles';
import { createDir } from './createDir';
import { think } from './think';
import { finish } from './finish';

export const dispatchAction = async (
    proposal_id: string,
    action: ActionType,
    args: any
): Promise<RuntimeResponse> => {
    switch (action) {
        case ActionType.THINK:
            return think(proposal_id, args);
        case ActionType.FINISH:
            return finish(proposal_id, args);
        case ActionType.READ_FILE:
            return readFile(proposal_id, args);
        case ActionType.WRITE_FILE:
            return writeFile(proposal_id, args);
        case ActionType.DELETE_FILE:
            return deleteFile(proposal_id, args);
        case ActionType.RENAME_FILE:
            return renameFile(proposal_id, args);
        case ActionType.LIST_FILES:
            return listFiles(proposal_id, args);
        case ActionType.CREATE_DIRECTORY:
            return createDir(proposal_id, args);
        default:
            return {
                proposal_id,
                action,
                outcome: "EXECUTION_ERROR",
                result: null,
                error: {
                    error_code: "EXECUTION_ERROR",
                    message: `Action ${action} is not implemented or supported.`
                }
            };
    }
};
