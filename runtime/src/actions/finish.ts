import { ExecutionPrimitive, FinishArgs, RuntimeResponse } from '../../../sys-common/schemas/ExecutionContracts';
import { ActionType } from '../../../sys-common/schemas/ActionTypeRegistry';

export const finish: ExecutionPrimitive<FinishArgs> = async (
    proposal_id: string,
    args: FinishArgs
): Promise<RuntimeResponse> => {
    // Meta action FINISH is a no-op that just returns SUCCESS and echoes the final response
    return {
        proposal_id,
        action: ActionType.FINISH,
        outcome: "SUCCESS",
        result: { final_response: args.response },
        error: null
    };
};
