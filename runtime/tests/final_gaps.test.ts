import { describe, it, expect, vi } from 'vitest';
import * as fsPromises from 'fs/promises';
import { ValidateProposal } from '../src/Proposal_Handler.js';
import { authorizeProposal, validateReceive } from '../src/stepRuntime.js';
import { deleteFile } from '../src/actions/deleteFile.js';

vi.mock('fs/promises');

describe('Final Coverage Gaps', () => {
    it('Proposal_Handler: should handle audit events without proposal_id', async () => {
        // Line 150 of Proposal_Handler.ts
        vi.mocked(fsPromises.readdir).mockResolvedValue(['test.jsonl'] as any);
        vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({ record_type: 'audit_event' }));
        
        const proposal = {
            schema_version: "1.0.0",
            id: "unique-id",
            reasoning: "Reason",
            action: "THINK",
            args: {}
        };
        const result = await ValidateProposal(proposal as any);
        expect(result).toBeUndefined();
    });

    it('stepRuntime: should handle null bytes in paths', () => {
        // Line 264 of stepRuntime.ts
        const proposal = {
            action: "READ_FILE",
            args: { path: "/sandbox/file\0.txt" }
        };
        expect(() => authorizeProposal(proposal as any)).toThrow(/null byte/);
    });

    it('deleteFile: should handle paths not starting with /sandbox/', async () => {
        // Line 12 of deleteFile.ts
        const res = await deleteFile('1', { path: '/etc/passwd' } as any);
        expect(res.outcome).toBe('DENIED');
        expect(res.error?.message).toContain('Path must start with /sandbox/');
    });

    it('validateReceive: should handle invalid ASCII', () => {
        // Line 158 of stepRuntime.ts
        const result = validateReceive('{"action": "\u0080"}');
        expect(result).toBeDefined();
        expect(result?.ErrorId).toBe('INVALID_ASCII');
    });
});
