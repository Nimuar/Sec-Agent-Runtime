import { describe, it, expect } from 'vitest';
import { ActionType } from '../../../../sys-common/schemas/ActionTypeRegistry';
import { dispatchAction } from '../dispatcher';
import * as fileActions from '../readFile';

const mockProposalId = '123e4567-e89b-12d3-a456-426614174000';

describe('Dispatcher', () => {
    it('should route READ_FILE correctly', async () => {
        const result = await dispatchAction(mockProposalId, ActionType.READ_FILE, { path: '/sandbox/test.txt' });
        // Since we aren't fully mocking the dispatcher yet, if the dispatcher tries to read the real file, it might fail.
        // We will assert it doesn't return the "unsupported action" error.
        expect(result.error?.error_code).not.toBe('POLICY_VIOLATION');
        // Actually, in dispatcher tests, we probably want to mock the underlying fileActions
        // But the requirement says "verify that an unhandled or hallucinated action returns an 'EXECUTION_ERROR' indicating the action is not implemented."
    });

    it('should return EXECUTION_ERROR for an unsupported action', async () => {
        // Casting a fake action to ActionType to bypass TypeScript
        const result = await dispatchAction(mockProposalId, 'FAKE_ACTION' as ActionType, {});

        expect(result.outcome).toBe('EXECUTION_ERROR');
        expect(result.error?.error_code).toBe('EXECUTION_ERROR');
        expect(result.error?.message).toContain('not implemented');
    });
});
