import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionType } from '../src/schemas/ActionTypeRegistry.js';
import { dispatchAction } from '../src/actions/dispatcher.js';

// Mock all the action handlers
vi.mock('../src/actions/readFile', () => ({ readFile: vi.fn() }));
vi.mock('../src/actions/writeFile', () => ({ writeFile: vi.fn() }));
vi.mock('../src/actions/deleteFile', () => ({ deleteFile: vi.fn() }));
vi.mock('../src/actions/renameFile', () => ({ renameFile: vi.fn() }));
vi.mock('../src/actions/listFiles', () => ({ listFiles: vi.fn() }));
vi.mock('../src/actions/createDir', () => ({ createDir: vi.fn() }));
vi.mock('../src/actions/think', () => ({ think: vi.fn() }));
vi.mock('../src/actions/finish', () => ({ finish: vi.fn() }));

import { readFile } from '../src/actions/readFile';
import { writeFile } from '../src/actions/writeFile';
import { deleteFile } from '../src/actions/deleteFile';
import { renameFile } from '../src/actions/renameFile';
import { listFiles } from '../src/actions/listFiles';
import { createDir } from '../src/actions/createDir';
import { think } from '../src/actions/think';
import { finish } from '../src/actions/finish';

describe('Action Dispatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should dispatch THINK action', async () => {
        await dispatchAction('1', ActionType.THINK, {});
        expect(think).toHaveBeenCalledWith('1', {});
    });

    it('should dispatch FINISH action', async () => {
        await dispatchAction('1', ActionType.FINISH, {});
        expect(finish).toHaveBeenCalledWith('1', {});
    });

    it('should dispatch READ_FILE action', async () => {
        await dispatchAction('1', ActionType.READ_FILE, { path: 'test' });
        expect(readFile).toHaveBeenCalledWith('1', { path: 'test' });
    });

    it('should dispatch WRITE_FILE action', async () => {
        await dispatchAction('1', ActionType.WRITE_FILE, { path: 'test', content: 'test' });
        expect(writeFile).toHaveBeenCalledWith('1', { path: 'test', content: 'test' });
    });

    it('should dispatch DELETE_FILE action', async () => {
        await dispatchAction('1', ActionType.DELETE_FILE, { path: 'test' });
        expect(deleteFile).toHaveBeenCalledWith('1', { path: 'test' });
    });

    it('should dispatch RENAME_FILE action', async () => {
        await dispatchAction('1', ActionType.RENAME_FILE, { oldPath: 'a', newPath: 'b' });
        expect(renameFile).toHaveBeenCalledWith('1', { oldPath: 'a', newPath: 'b' });
    });

    it('should dispatch LIST_FILES action', async () => {
        await dispatchAction('1', ActionType.LIST_FILES, { path: 'test' });
        expect(listFiles).toHaveBeenCalledWith('1', { path: 'test' });
    });

    it('should dispatch CREATE_DIRECTORY action', async () => {
        await dispatchAction('1', ActionType.CREATE_DIRECTORY, { path: 'test' });
        expect(createDir).toHaveBeenCalledWith('1', { path: 'test' });
    });

    it('should return EXECUTION_ERROR for unsupported actions', async () => {
        const response = await dispatchAction('1', 'UNKNOWN_ACTION' as ActionType, {});
        expect(response.outcome).toBe('EXECUTION_ERROR');
        expect(response.error?.message).toContain('not implemented');
    });
});
