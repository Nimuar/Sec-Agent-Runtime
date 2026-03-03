import * as z from "zod";
import { ProposalErrorCode } from "./ProposalErrorRegistry.js"

const ValidASCII = /^[ -~]*$/;

// Base structure for validation error responses sent back to agent
const Base = z.object({
    schema_version: z.string().regex(/^1\.\d+\.\d+$/),
    id: z.string().uuid().default(() => crypto.randomUUID()),
    input: z.string().min(1), // Original proposal that failed validation
});

export const GateList = z.discriminatedUnion("ErrorId", [
    // NULL BYTE CHECK 
    Base.extend({
        ErrorId: z.literal(ProposalErrorCode.NULL_BYTE),
        args: z.object({
            message: z.literal("Cannot contain null byte characters")
        }).strict()
    }),

    // INVALID ASCII CHECK 
    Base.extend({
        ErrorId: z.literal(ProposalErrorCode.INVALID_ASCII),
        args: z.object({
            message: z.literal("Cannot contain invalid ASCII characters")
        }).strict()
    }),

    // PAYLOAD SIZE CHECK 
    Base.extend({
        ErrorId: z.literal(ProposalErrorCode.PAYLOAD_OVERFLOW),
        args: z.object({
            size: z.number(), // Actual size in bytes
            limit: z.number(), // Maximum allowed size
            message: z.literal("Payload exceeds maximum size of 1024 characters")
        }).strict()
    }),

    // ID COLLISION CHECK 
    Base.extend({
        ErrorId: z.literal(ProposalErrorCode.ID_COLLISION),
        args: z.object({
            incoming: z.string().uuid(), // ID from the incoming proposal
            backlog: z.string().uuid(), // ID from backlog database. 
            message: z.literal("ID matches with previously logged proposal ID")
        }).strict()
    }),


    // MISSING CONTENT CHECK 
    Base.extend({
        ErrorId: z.literal(ProposalErrorCode.MISSING_CONTENT),
        args: z.object({
            field: z.string(), // Which field is missing
            message: z.literal("Required field is missing or empty") // Description of the missing content
        }).strict()
    }),

    //Invalid Content Check - Catchall
    Base.extend({
        ErrorId: z.literal(ProposalErrorCode.INVALID_CONTENT),
        args: z.object({
            field: z.string(), // Which field is missing
            message: z.literal("Required field is Invalid") // Description of the missing content
        }).strict()
    })
]);

export type GateError = z.infer<typeof GateList>;