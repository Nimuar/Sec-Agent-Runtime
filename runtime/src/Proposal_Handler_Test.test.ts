import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ValidateProposal } from "./Proposal_Handler.js";
import { proposal_limit, ProposalErrorCode } from "../../sys-common/schemas/ProposalErrorConfig.js";
import * as config from "../../sys-common/schemas/ProposalErrorConfig.js";
import { ActionType } from "../../sys-common/schemas/ActionTypeRegistry.js";
import { AgentProposal } from "../../sys-common/schemas/ProposalSchema.js";
import * as fs from "fs";

const TEST_UUID = "00000000-0000-0000-0000-000000000000";
//Testing repo change\
const test = "This is a test string to verify that the testing framework is working correctly.";
// Clear ID log before and after each test to prevent cross-test ID collisions
beforeEach(() => { fs.writeFileSync(config.ID_LOG_PATH, ""); });
afterEach(() => { fs.writeFileSync(config.ID_LOG_PATH, ""); });

describe("Proposal Handler Validation Tests", () => {

    // ── ValidateNullByte ──────────────────────────────────────────────────────
    describe("ValidateNullByte", () => {

        it("should return NULL_BYTE error for proposals containing null byte characters", () => {
            const proposalNullByte: AgentProposal = {
                schema_version: "1.0.0",
                id: "123e4567-e89b-12d3-a456-426614174000",
                reasoning: "Write a short project status note. \0",
                action: ActionType.WRITE_FILE,
                args: {
                    path: "/sandbox/notes/status.md",
                    content: "Sprint complete."
                }
            };

            const expectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: proposalNullByte,
                ErrorId: ProposalErrorCode.NULL_BYTE,
                args: { message: "Cannot contain null byte characters" }
            };

            expect(ValidateProposal(proposalNullByte)).toEqual(expectedError);
        });

        it("should pass for proposals with no null bytes", () => {
            const validProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "123e4567-e89b-12d3-a456-426614174001",
                reasoning: "A clean proposal with no null bytes.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(validProposal)).toBeUndefined();
        });
    });

    // ── ValidateASCII ─────────────────────────────────────────────────────────
    describe("ValidateASCII", () => {

        it("should return INVALID_ASCII error for proposals with non-ASCII characters", () => {
            const invalidASCIIProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "223e4567-e89b-12d3-a456-426614174000",
                reasoning: "Invalid character: \x01",
                action: ActionType.THINK,
                args: {}
            };

            const expectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: invalidASCIIProposal,
                ErrorId: ProposalErrorCode.INVALID_ASCII,
                args: { message: "Cannot contain invalid ASCII characters" }
            };

            expect(ValidateProposal(invalidASCIIProposal)).toEqual(expectedError);
        });

        it("should pass for proposals containing only valid ASCII characters", () => {
            const validASCIIProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "223e4567-e89b-12d3-a456-426614174001",
                reasoning: "All valid ASCII characters here.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(validASCIIProposal)).toBeUndefined();
        });
    });

    // ── validatePayloadSize ───────────────────────────────────────────────────
    describe("validatePayloadSize", () => {

        it("should return PAYLOAD_OVERFLOW error for proposals exceeding the size limit", () => {
            const oversizedProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "323e4567-e89b-12d3-a456-426614174000",
                reasoning: "A".repeat(1026),
                action: ActionType.THINK,
                args: {}
            };
            const proposal_bytes = new TextEncoder().encode(JSON.stringify(oversizedProposal)).byteLength;

            const expectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: oversizedProposal,
                ErrorId: ProposalErrorCode.PAYLOAD_OVERFLOW,
                args: {
                    size: proposal_bytes,
                    limit: proposal_limit,
                    message: "Payload exceeds maximum size of 1024 characters"
                }
            };

            expect(ValidateProposal(oversizedProposal)).toEqual(expectedError);
        });

        it("should pass for proposals within the size limit", () => {
            const smallProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "323e4567-e89b-12d3-a456-426614174001",
                reasoning: "Short proposal.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(smallProposal)).toBeUndefined();
        });
    });

    // ── ValidateIDCollision ───────────────────────────────────────────────────
    describe("ValidateIDCollision", () => {

        it("should return ID_COLLISION error for proposals with a previously seen ID", () => {
            fs.writeFileSync(config.ID_LOG_PATH, TEST_UUID + "\n");

            const proposalWithIDCollision: AgentProposal = {
                schema_version: "1.0.0",
                id: TEST_UUID,
                reasoning: "This proposal has a colliding ID.",
                action: ActionType.THINK,
                args: {}
            };

            const expectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: proposalWithIDCollision,
                ErrorId: ProposalErrorCode.ID_COLLISION,
                args: {
                    incoming: TEST_UUID,
                    message: "ID matches with previously logged proposal ID"
                }
            };

            expect(ValidateProposal(proposalWithIDCollision)).toEqual(expectedError);
        });

        it("should pass for proposals with a unique ID not in the log", () => {
            const uniqueIDProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "423e4567-e89b-12d3-a456-426614174001",
                reasoning: "This proposal has a fresh unique ID.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(uniqueIDProposal)).toBeUndefined();
        });
    });

    // ── ValidateCoreStructure ─────────────────────────────────────────────────
    describe("ValidateCoreStructure", () => {

        it("should return MISSING_CONTENT error for proposals with an incorrect schema version", () => {
            const wrongVersionProposal: AgentProposal = {
                schema_version: "2.0.0",
                id: "",
                reasoning: "Wrong schema version.",
                action: ActionType.THINK,
                args: {}
            };

            const expectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: wrongVersionProposal,
                ErrorId: ProposalErrorCode.MISSING_CONTENT,
                args: {
                    field: ["id","schema_version"].join(", "),
                    message: "Required field is missing or incorrectly formatted"
                }
            };

            expect(ValidateProposal(wrongVersionProposal)).toEqual(expectedError);
        });

        it("should pass for a fully valid proposal", () => {
            const validProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "523e4567-e89b-12d3-a456-426614174001",
                reasoning: "This proposal is fully valid.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(validProposal)).toBeUndefined();
        });
    });

});
