import { ExecutionPrimitive, ThinkArgs, RuntimeResponse } from '../../../sys-common/schemas/ExecutionContracts';
import { ActionType } from '../../../sys-common/schemas/ActionTypeRegistry';

export const think: ExecutionPrimitive<ThinkArgs> = async (
    proposal_id: string,
    _args: ThinkArgs
): Promise<RuntimeResponse> => {
    // Meta action THINK is a no-op that just returns SUCCESS
    return {
        proposal_id,
        action: ActionType.THINK,
        outcome: "SUCCESS",
        result: null,
        error: null
    };
};
