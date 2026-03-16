import { ActionType } from '../schemas/ActionTypeRegistry.js';
import { ExecutionPrimitive, ThinkArgs, RuntimeResponse } from '../schemas/ExecutionContracts.js';

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
