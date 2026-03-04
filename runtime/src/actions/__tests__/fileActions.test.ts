import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import { ActionType } from '../../../../sys-common/schemas/ActionTypeRegistry';
import { readFile } from '../readFile';
import { writeFile } from '../writeFile';
import { deleteFile } from '../deleteFile';
import { renameFile } from '../renameFile';
import { listFiles } from '../listFiles';
import { createDir } from '../createDir';

vi.mock('fs/promises');

describe('File Actions (Primitives)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const mockProposalId = '123e4567-e89b-12d3-a456-426614174000';

    describe('readFile', () => {
        it('should return SUCCESS and file content for valid sandbox path', async () => {
            vi.mocked(fs.readFile).mockResolvedValueOnce('test content');
            const result = await readFile(mockProposalId, { path: '/sandbox/test.txt' });

            expect(result.outcome).toBe('SUCCESS');
            expect(result.error).toBeNull();
            expect(result.result).toEqual({ content: 'test content' });
            expect(fs.readFile).toHaveBeenCalledWith('/sandbox/test.txt', 'utf-8');
        });

        it('should return DENIED for path outside sandbox', async () => {
            const result = await readFile(mockProposalId, { path: '/etc/passwd' });

            expect(result.outcome).toBe('DENIED');
            expect(result.error?.error_code).toBe('POLICY_VIOLATION');
            expect(fs.readFile).not.toHaveBeenCalled();
        });

        it('should return EXECUTION_ERROR for fs read failure', async () => {
            vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
            const result = await readFile(mockProposalId, { path: '/sandbox/missing.txt' });

            expect(result.outcome).toBe('EXECUTION_ERROR');
            expect(result.error?.error_code).toBe('EXECUTION_ERROR');
            expect(result.error?.message).toContain('ENOENT');
        });
    });

    describe('writeFile', () => {
        it('should return SUCCESS for valid sandbox path and allowed extension', async () => {
            vi.mocked(fs.writeFile).mockResolvedValueOnce();
            const result = await writeFile(mockProposalId, { path: '/sandbox/test.txt', content: 'hello' });

            expect(result.outcome).toBe('SUCCESS');
            expect(result.error).toBeNull();
            expect(fs.writeFile).toHaveBeenCalledWith('/sandbox/test.txt', 'hello');
        });

        it('should return DENIED for disallowed extension', async () => {
            const result = await writeFile(mockProposalId, { path: '/sandbox/script.js', content: 'console.log("hello")' });

            expect(result.outcome).toBe('DENIED');
            expect(result.error?.error_code).toBe('POLICY_VIOLATION');
            expect(fs.writeFile).not.toHaveBeenCalled();
        });

        it('should return DENIED for path outside sandbox', async () => {
            const result = await writeFile(mockProposalId, { path: '/test.txt', content: 'hello' });

            expect(result.outcome).toBe('DENIED');
            expect(result.error?.error_code).toBe('POLICY_VIOLATION');
        });

        it('should return EXECUTION_ERROR for fs write failure', async () => {
            vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('EACCES: permission denied'));
            const result = await writeFile(mockProposalId, { path: '/sandbox/test.txt', content: 'hello' });

            expect(result.outcome).toBe('EXECUTION_ERROR');
            expect(result.error?.message).toContain('EACCES');
        });
    });

    describe('deleteFile', () => {
        it('should return SUCCESS for valid sandbox path and allowed extension', async () => {
            vi.mocked(fs.unlink).mockResolvedValueOnce();
            const result = await deleteFile(mockProposalId, { path: '/sandbox/test.md' });

            expect(result.outcome).toBe('SUCCESS');
            expect(result.error).toBeNull();
            expect(fs.unlink).toHaveBeenCalledWith('/sandbox/test.md');
        });

        it('should return DENIED for disallowed extension', async () => {
            const result = await deleteFile(mockProposalId, { path: '/sandbox/important.bin' });
            expect(result.outcome).toBe('DENIED');
            expect(result.error?.error_code).toBe('POLICY_VIOLATION');
            expect(fs.unlink).not.toHaveBeenCalled();
        });

        it('should return EXECUTION_ERROR for fs delete failure', async () => {
            vi.mocked(fs.unlink).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
            const result = await deleteFile(mockProposalId, { path: '/sandbox/test.txt' });

            expect(result.outcome).toBe('EXECUTION_ERROR');
            expect(result.error?.message).toContain('ENOENT');
        });
    });

    describe('renameFile', () => {
        it('should return SUCCESS for valid sandbox paths and allowed destination extension', async () => {
            vi.mocked(fs.rename).mockResolvedValueOnce();
            const result = await renameFile(mockProposalId, { source: '/sandbox/old.txt', destination: '/sandbox/new.md' });

            expect(result.outcome).toBe('SUCCESS');
            expect(fs.rename).toHaveBeenCalledWith('/sandbox/old.txt', '/sandbox/new.md');
        });

        it('should return DENIED if source is outside sandbox', async () => {
            const result = await renameFile(mockProposalId, { source: '/old.txt', destination: '/sandbox/new.txt' });
            expect(result.outcome).toBe('DENIED');
        });

        it('should return DENIED if destination is outside sandbox', async () => {
            const result = await renameFile(mockProposalId, { source: '/sandbox/old.txt', destination: '/new.txt' });
            expect(result.outcome).toBe('DENIED');
        });

        it('should return DENIED if destination extension is dissallowed', async () => {
            const result = await renameFile(mockProposalId, { source: '/sandbox/old.txt', destination: '/sandbox/new.bin' });
            expect(result.outcome).toBe('DENIED');
        });

        it('should return EXECUTION_ERROR for fs rename failure', async () => {
            vi.mocked(fs.rename).mockRejectedValueOnce(new Error('EPERM: operation not permitted'));
            const result = await renameFile(mockProposalId, { source: '/sandbox/old.txt', destination: '/sandbox/new.txt' });
            expect(result.outcome).toBe('EXECUTION_ERROR');
            expect(result.error?.message).toContain('EPERM');
        });
    });

    describe('listFiles', () => {
        it('should return SUCCESS and file list for valid sandbox path', async () => {
            const mockDirents = [
                { name: 'file1.txt', isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false },
                { name: 'dir1', isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false }
            ] as any[];
            vi.mocked(fs.readdir).mockResolvedValueOnce(mockDirents);
            const result = await listFiles(mockProposalId, { path: '/sandbox/dir' });

            expect(result.outcome).toBe('SUCCESS');
            expect(result.result).toBeDefined();
            expect(fs.readdir).toHaveBeenCalledWith('/sandbox/dir', { withFileTypes: true });
        });

        it('should return DENIED for path outside sandbox', async () => {
            const result = await listFiles(mockProposalId, { path: '/home/user' });
            expect(result.outcome).toBe('DENIED');
            expect(fs.readdir).not.toHaveBeenCalled();
        });

        it('should return EXECUTION_ERROR for fs readdir failure', async () => {
            vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
            const result = await listFiles(mockProposalId, { path: '/sandbox/missing' });
            expect(result.outcome).toBe('EXECUTION_ERROR');
        });

        it('should return EXECUTION_ERROR for an empty directory', async () => {
            vi.mocked(fs.readdir).mockResolvedValueOnce([]);
            const result = await listFiles(mockProposalId, { path: '/sandbox/emptydir' });

            expect(result.outcome).toBe('EXECUTION_ERROR');
            expect(result.error?.message).toBe('Directory is empty');
        });
    });

    describe('createDir', () => {
        it('should return SUCCESS for valid sandbox path', async () => {
            vi.mocked(fs.mkdir).mockResolvedValueOnce('');
            const result = await createDir(mockProposalId, { path: '/sandbox/newdir' });

            expect(result.outcome).toBe('SUCCESS');
            expect(fs.mkdir).toHaveBeenCalledWith('/sandbox/newdir', { recursive: true });
        });

        it('should return DENIED for path outside sandbox', async () => {
            const result = await createDir(mockProposalId, { path: '/newdir' });
            expect(result.outcome).toBe('DENIED');
            expect(fs.mkdir).not.toHaveBeenCalled();
        });

        it('should return EXECUTION_ERROR for fs mkdir failure', async () => {
            vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('EEXIST: file already exists'));
            const result = await createDir(mockProposalId, { path: '/sandbox/existingdir' });
            expect(result.outcome).toBe('EXECUTION_ERROR');
        });
    });
});
