import * as path from 'path';

/** Canonical sandbox directory — resolved once from this file's location. */
export const SANDBOX_DIR = path.join(import.meta.dirname, '../../sandbox');

/**
 * Map a virtual /sandbox/... path to a physical filesystem path.
 * Callers are responsible for validating that virtualPath starts with '/sandbox/'.
 */
export function resolveSandboxPath(virtualPath: string): string {
    return path.join(SANDBOX_DIR, virtualPath.slice('/sandbox/'.length));
}

/**
 * Map native Node.js fs error codes to spec-aligned ExecutionErrorId strings.
 * Falls back to UNKNOWN_ERROR for unmapped codes.
 */
export function mapFsErrorCode(err: any): string {
    switch (err.code) {
        case 'ENOENT':  return 'PATH_NOT_FOUND';
        case 'EISDIR':  return 'IS_DIRECTORY';
        case 'ENOTDIR': return 'NOT_A_DIRECTORY';
        case 'EACCES':  return 'PERMISSION_DENIED';
        case 'EEXIST':  return 'ALREADY_EXISTS';
        case 'ENOSPC':  return 'DISK_FULL';
        case 'EIO':     return 'IO_ERROR';
        default:        return 'UNKNOWN_ERROR';
    }
}
