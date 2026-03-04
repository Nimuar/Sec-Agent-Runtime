import * as z from "zod";
import { filter, log_schema_version, LogSeverity } from "./ProposalErrorConfig.js"
import { error, timeStamp } from "node:console";


// Base structure for validation error responses sent back to agent
const Base = z.object({
    schema_version: z.string().regex(/^1\.\d+\.\d+$/),
    id: z.string().uuid().default(() => crypto.randomUUID()),
    input: z.string().min(1), // Original proposal that failed validation
});

export const GateList = z.discriminatedUnion("ErrorId", [
    // NULL BYTE CHECK 
    Base.extend({
        ErrorId: z.literal(filter.NULL_BYTE),
        args: z.object({
            message: z.literal("Cannot contain null byte characters")
        }).strict()
    }),

    // INVALID ASCII CHECK 
    Base.extend({
        ErrorId: z.literal(filter.INVALID_ASCII),
        args: z.object({
            message: z.literal("Cannot contain invalid ASCII characters")
        }).strict()
    }),

    // PAYLOAD SIZE CHECK 
    Base.extend({
        ErrorId: z.literal(filter.PAYLOAD_OVERFLOW),
        args: z.object({
            size: z.number(), // Actual size in bytes
            limit: z.number(), // Limit from config
            message: z.literal("Payload exceeds maximum size of 1024 characters")
        }).strict()
    }),

    // ID COLLISION CHECK 
    Base.extend({
        ErrorId: z.literal(filter.ID_COLLISION),
        args: z.object({
            incoming: z.string().uuid(), // ID from the incoming proposal
            message: z.literal("ID matches with previously logged proposal ID")
        }).strict()
    }),


    // MISSING CONTENT CHECK 
    Base.extend({
        ErrorId: z.literal(filter.MISSING_CONTENT),
        args: z.object({
            field:  z.string(), // Which field is missing
            message: z.literal("Required field is missing or empty") // Description of the missing content
        }).strict()
    }),


]);
export type GateError = z.infer<typeof GateList>;




    