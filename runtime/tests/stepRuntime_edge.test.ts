import { describe, it, expect, vi } from 'vitest';
import { authorizeProposal, processStep } from '../src/stepRuntime.js';
import { ActionType } from '../src/schemas/ActionTypeRegistry.js';

// Mock ValidateProposal and dispatchAction
vi.mock('../src/Proposal_Handler.js', () => ({
    ValidateProposal: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../src/actions/dispatcher.js', () => ({
    dispatchAction: vi.fn().mockResolvedValue({ outcome: "SUCCESS", result: {} })
}));

import { ValidateProposal } from '../src/Proposal_Handler.js';
import { dispatchAction } from '../src/actions/dispatcher.js';

describe('stepRuntime Edge Cases', () => {
    describe('authorizeProposal - RENAME_FILE', () => {
        it('should authorize valid RENAME_FILE paths', () => {
            const proposal = {
                action: ActionType.RENAME_FILE,
                args: { source: '/sandbox/old.txt', destination: '/sandbox/new.txt' }
            };
            expect(() => authorizeProposal(proposal as any)).not.toThrow();
        });
    });

    describe('processStep - Validation Errors', () => {
        it('should handle ValidateProposal errors (e.g. ID Collision)', async () => {
            vi.mocked(ValidateProposal).mockResolvedValueOnce({
                ErrorId: "ID_COLLISION",
                args: { message: "ID Collision detected" }
            } as any);

            const payload = JSON.stringify({
                schema_version: "1.0.0",
                id: "550e8400-e29b-41d4-a716-446655440000",
                reasoning: "Test",
                action: "THINK",
                args: {}
            });

            const response = await processStep(payload, 'trace-id');
            expect(response.outcome).toBe('VALIDATION_ERROR');
            expect(response.error?.error_code).toBe('ID_COLLISION');
        });

        it('should handle DENIED outcome from dispatcher', async () => {
            vi.mocked(dispatchAction).mockResolvedValueOnce({
                outcome: "DENIED",
                error: { error_code: "POLICY_VIOLATION", message: "Forbidden" }
            } as any);

            const payload = JSON.stringify({
                schema_version: "1.0.0",
                id: "550e8400-e29b-41d4-a716-446655440001",
                reasoning: "Test",
                action: "THINK",
                args: {}
            });

            const response = await processStep(payload, 'trace-id');
            expect(response.outcome).toBe('DENIED');
        });
    });
});
