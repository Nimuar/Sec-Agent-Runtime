import * as z from "zod";
import { ActionType } from "./ActionTypeRegistry.js";
import { ExecutionErrorId as ErrorId } from "./ExecutionRegistry.js";

// Reusable sandbox path validator for file-operation error members
const sandboxPath = z.string()
    .startsWith("/sandbox/")
    .refine(p => p.endsWith(".txt") || p.endsWith(".md"));

// Common fields present on every runtime error response
const BaseError = z.object({
    version: z.string().regex(/^1\.\d+\.\d+$/),
    timestamp: z.coerce.date(),
    id: z.string().uuid().default(() => crypto.randomUUID()),
    reasoning: z.string().min(1),
});

export const SchemaErrorVal = z.discriminatedUnion("action", [
    // THINK — no path; only unknown errors possible
    BaseError.extend({
        action: z.literal(ActionType.THINK),
        args: z.object({
            code: z.union([
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),

    // FINISH — no path; only unknown errors possible
    BaseError.extend({
        action: z.literal(ActionType.FINISH),
        args: z.object({
            code: z.union([
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),

    // READ_FILE
    BaseError.extend({
        action: z.literal(ActionType.READ_FILE),
        args: z.object({
            path: sandboxPath,
            code: z.union([
                z.literal(ErrorId.PATH_MISSING),
                z.literal(ErrorId.PATH_NOT_STRING),
                z.literal(ErrorId.PATH_OUT_OF_BOUNDS),
                z.literal(ErrorId.FILE_NOT_FOUND),
                z.literal(ErrorId.IS_DIRECTORY),
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),

    // WRITE_FILE
    BaseError.extend({
        action: z.literal(ActionType.WRITE_FILE),
        args: z.object({
            path: sandboxPath,
            code: z.union([
                z.literal(ErrorId.PATH_MISSING),
                z.literal(ErrorId.PATH_OUT_OF_BOUNDS),
                z.literal(ErrorId.DISK_FULL),
                z.literal(ErrorId.IO_ERROR),
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),

    // LIST_FILES — directories don't need extension restriction
    BaseError.extend({
        action: z.literal(ActionType.LIST_FILES),
        args: z.object({
            path: z.string().startsWith("/sandbox/"),
            code: z.union([
                z.literal(ErrorId.PATH_MISSING),
                z.literal(ErrorId.PATH_NOT_FOUND),
                z.literal(ErrorId.NOT_A_DIRECTORY),
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),

    // CREATE_DIRECTORY — directories don't need extension restriction
    BaseError.extend({
        action: z.literal(ActionType.CREATE_DIRECTORY),
        args: z.object({
            path: z.string().startsWith("/sandbox/"),
            code: z.union([
                z.literal(ErrorId.PATH_MISSING),
                z.literal(ErrorId.PATH_OUT_OF_BOUNDS),
                z.literal(ErrorId.ALREADY_EXISTS),
                z.literal(ErrorId.IO_ERROR),
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),

    // DELETE_FILE
    BaseError.extend({
        action: z.literal(ActionType.DELETE_FILE),
        args: z.object({
            path: sandboxPath,
            code: z.union([
                z.literal(ErrorId.PATH_MISSING),
                z.literal(ErrorId.FILE_NOT_FOUND),
                z.literal(ErrorId.PERMISSION_DENIED),
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),

    // RENAME_FILE — source (existing) and destination (target) both validated
    BaseError.extend({
        action: z.literal(ActionType.RENAME_FILE),
        args: z.object({
            source: sandboxPath,
            destination: sandboxPath,
            code: z.union([
                z.literal(ErrorId.PATH_MISSING),
                z.literal(ErrorId.FILE_NOT_FOUND),
                z.literal(ErrorId.TARGET_ALREADY_EXISTS),
                z.literal(ErrorId.PERMISSION_DENIED),
                z.literal(ErrorId.UNKNOWN_ERROR),
            ]),
        }).strict(),
    }),
]);

export type RuntimeErrorResponse = z.infer<typeof SchemaErrorVal>;
