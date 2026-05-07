import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import { readFile } from '../../src/actions/readFile.js';
import { writeFile } from '../../src/actions/writeFile.js';
import { deleteFile } from '../../src/actions/deleteFile.js';
import { listFiles } from '../../src/actions/listFiles.js';
import { createDir } from '../../src/actions/createDir.js';
import { renameFile } from '../../src/actions/renameFile.js';

vi.mock('fs/promises');

describe('File System Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('readFile should handle ENOENT', async () => {
        vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT', message: 'File not found' });
        const res = await readFile('1', { path: '/sandbox/missing' });
        expect(res.outcome).toBe('EXECUTION_ERROR');
        expect(res.error?.error_code).toBe('FILE_NOT_FOUND');
    });

    it('readFile should handle other FS errors via mapFsErrorCode', async () => {
        vi.mocked(fs.readFile).mockRejectedValue({ code: 'EACCES', message: 'Permission denied' });
        const res = await readFile('1', { path: '/sandbox/secret' });
        expect(res.outcome).toBe('EXECUTION_ERROR');
        expect(res.error?.error_code).toBe('PERMISSION_DENIED');
    });

    it('writeFile should handle IS_DIRECTORY', async () => {
        vi.mocked(fs.writeFile).mockRejectedValue({ code: 'EISDIR', message: 'Is a directory' });
        const res = await writeFile('1', { path: '/sandbox/dir.txt', content: 'data' });
        expect(res.outcome).toBe('EXECUTION_ERROR');
        expect(res.error?.error_code).toBe('IS_DIRECTORY');
    });

    it('deleteFile should handle generic errors', async () => {
        vi.mocked(fs.unlink).mockRejectedValue(new Error('Generic failure'));
        const res = await deleteFile('1', { path: '/sandbox/file.txt' });
        expect(res.outcome).toBe('EXECUTION_ERROR');
        expect(res.error?.error_code).toBe('UNKNOWN_ERROR');
    });

    it('listFiles should handle NOT_A_DIRECTORY', async () => {
        vi.mocked(fs.readdir).mockRejectedValue({ code: 'ENOTDIR', message: 'Not a directory' });
        const res = await listFiles('1', { path: '/sandbox/notadir' });
        expect(res.outcome).toBe('EXECUTION_ERROR');
        expect(res.error?.error_code).toBe('NOT_A_DIRECTORY');
    });

    it('createDir should handle EEXIST', async () => {
        vi.mocked(fs.mkdir).mockRejectedValue({ code: 'EEXIST', message: 'Already exists' });
        const res = await createDir('1', { path: '/sandbox/existing' });
        expect(res.outcome).toBe('EXECUTION_ERROR');
        expect(res.error?.error_code).toBe('ALREADY_EXISTS');
    });

    it('renameFile should handle cross-device link error', async () => {
        vi.mocked(fs.rename).mockRejectedValue({ code: 'EXDEV', message: 'Cross-device link' });
        const res = await renameFile('1', { source: '/sandbox/a.txt', destination: '/sandbox/b.txt' });
        expect(res.outcome).toBe('EXECUTION_ERROR');
        expect(res.error?.error_code).toBe('UNKNOWN_ERROR'); // Default case
    });
});
