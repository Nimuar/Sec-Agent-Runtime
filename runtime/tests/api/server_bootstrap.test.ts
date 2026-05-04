import { describe, it, expect, vi } from 'vitest';

// Mock fs and process BEFORE importing server
vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn().mockRejectedValue(new Error('Mock Disk Error'))
    }
}));

const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Server Bootstrap', () => {
    it('should exit when sandbox directory creation fails', async () => {
        try {
            // Import dynamically to trigger the top-level logic
            await import('../../src/server.js');
        } catch (e) {
            // Error might be propagated or caught by the module
        }

        expect(mockConsoleError).toHaveBeenCalledWith(
            "Failed to bootstrap sandbox directory:",
            expect.any(Error)
        );
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
