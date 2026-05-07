import { describe, it, expect, vi } from 'vitest';
import { ValidateProposal } from '../src/Proposal_Handler.js';
import * as fsPromises from 'fs/promises';

vi.mock('fs/promises');

describe('Proposal_Handler Edge Cases', () => {
    it('should catch invalid ASCII in top-level fields', async () => {
        const proposal = {
            schema_version: "1.0.0",
            id: "550e8400-e29b-41d4-a716-446655440000",
            reasoning: "Invalid ASCII \u0080",
            action: "THINK",
            args: {}
        };
        const result = await ValidateProposal(proposal as any);
        expect(result).toBeDefined();
        expect(result?.ErrorId).toBe('INVALID_ASCII');
    });

    it('should catch invalid ASCII in nested fields', async () => {
        const proposal = {
            schema_version: "1.0.0",
            id: "550e8400-e29b-41d4-a716-446655440000",
            reasoning: "Reason",
            action: "THINK",
            args: { key: "Invalid ASCII \u0080" }
        };
        const result = await ValidateProposal(proposal as any);
        expect(result).toBeDefined();
        expect(result?.ErrorId).toBe('INVALID_ASCII');
    });

    it('should handle filesystem errors in ValidateIDCollision gracefully', async () => {
        vi.mocked(fsPromises.readdir).mockRejectedValue(new Error('Disk Error'));
        const proposal = {
            schema_version: "1.0.0",
            id: "550e8400-e29b-41d4-a716-446655440000",
            reasoning: "Reason",
            action: "THINK",
            args: {}
        };
        // Should catch the error and return undefined (no collision)
        const result = await ValidateProposal(proposal as any);
        expect(result).toBeUndefined();
    });
});
