import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { SANDBOX_DIR, resolveSandboxPath, mapFsErrorCode } from '../sandboxPath';

describe('sandboxPath', () => {

    describe('SANDBOX_DIR', () => {
        it('should resolve to a directory named sandbox', () => {
            expect(path.isAbsolute(SANDBOX_DIR)).toBe(true);
            expect(path.basename(SANDBOX_DIR)).toBe('sandbox');
        });
    });

    describe('resolveSandboxPath', () => {
        it('should resolve a simple file path within sandbox', () => {
            const result = resolveSandboxPath('/sandbox/test.txt');
            expect(result).toBe(path.resolve(SANDBOX_DIR, 'test.txt'));
        });

        it('should resolve a nested file path within sandbox', () => {
            const result = resolveSandboxPath('/sandbox/subdir/file.md');
            expect(result).toBe(path.resolve(SANDBOX_DIR, 'subdir', 'file.md'));
        });

        it('should resolve the sandbox root itself', () => {
            const result = resolveSandboxPath('/sandbox/');
            expect(result).toBe(SANDBOX_DIR);
        });

        it('should throw on path traversal with ../', () => {
            expect(() => resolveSandboxPath('/sandbox/../etc/passwd'))
                .toThrow('Path traversal blocked');
        });

        it('should throw on path traversal with nested ../', () => {
            expect(() => resolveSandboxPath('/sandbox/subdir/../../etc/passwd'))
                .toThrow('Path traversal blocked');
        });

        it('should throw on path traversal to parent directory', () => {
            expect(() => resolveSandboxPath('/sandbox/..'))
                .toThrow('Path traversal blocked');
        });

        it('should set error code to PATH_TRAVERSAL on traversal attempt', () => {
            try {
                resolveSandboxPath('/sandbox/../escape');
                expect.unreachable('Should have thrown');
            } catch (err: any) {
                expect(err.code).toBe('PATH_TRAVERSAL');
            }
        });

        it('should allow paths that contain .. but resolve within sandbox', () => {
            // /sandbox/subdir/../file.txt resolves to /sandbox/file.txt — still inside
            const result = resolveSandboxPath('/sandbox/subdir/../file.txt');
            expect(result).toBe(path.resolve(SANDBOX_DIR, 'file.txt'));
        });
    });

    describe('mapFsErrorCode', () => {
        it('should map ENOENT to PATH_NOT_FOUND', () => {
            expect(mapFsErrorCode({ code: 'ENOENT' })).toBe('PATH_NOT_FOUND');
        });

        it('should map EISDIR to IS_DIRECTORY', () => {
            expect(mapFsErrorCode({ code: 'EISDIR' })).toBe('IS_DIRECTORY');
        });

        it('should map ENOTDIR to NOT_A_DIRECTORY', () => {
            expect(mapFsErrorCode({ code: 'ENOTDIR' })).toBe('NOT_A_DIRECTORY');
        });

        it('should map EACCES to PERMISSION_DENIED', () => {
            expect(mapFsErrorCode({ code: 'EACCES' })).toBe('PERMISSION_DENIED');
        });

        it('should map EEXIST to ALREADY_EXISTS', () => {
            expect(mapFsErrorCode({ code: 'EEXIST' })).toBe('ALREADY_EXISTS');
        });

        it('should map ENOSPC to DISK_FULL', () => {
            expect(mapFsErrorCode({ code: 'ENOSPC' })).toBe('DISK_FULL');
        });

        it('should map EIO to IO_ERROR', () => {
            expect(mapFsErrorCode({ code: 'EIO' })).toBe('IO_ERROR');
        });

        it('should map unknown codes to UNKNOWN_ERROR', () => {
            expect(mapFsErrorCode({ code: 'ESOMETHING' })).toBe('UNKNOWN_ERROR');
        });

        it('should map undefined code to UNKNOWN_ERROR', () => {
            expect(mapFsErrorCode({})).toBe('UNKNOWN_ERROR');
        });
    });
});
