import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ValidateProposal } from "./Proposal_Handler.js";
import { proposal_limit } from "./schemas/ProposalErrorConfig.js";
import { ProposalErrorCode } from "./schemas/ProposalErrorRegistry.js";
import * as config from "./schemas/ProposalErrorConfig.js";
import { ActionType } from "./schemas/ActionTypeRegistry.js";
import { AgentProposal } from "./schemas/ProposalSchema.js";
import * as fs from "fs";
import { dirname } from "path";

const TEST_UUID = "00000000-0000-0000-0000-000000000000";
// Clear ID log before and after each test to prevent cross-test ID collisions
beforeEach(() => { fs.mkdirSync(dirname(config.ID_LOG_PATH), { recursive: true }); fs.writeFileSync(config.ID_LOG_PATH, ""); });
afterEach(() => { fs.mkdirSync(dirname(config.ID_LOG_PATH), { recursive: true }); fs.writeFileSync(config.ID_LOG_PATH, ""); });

describe("Proposal Handler Validation Tests", () => {

    // ── ValidateNullByte ──────────────────────────────────────────────────────
    describe("ValidateNullByte", () => {

        it("should return NULL_BYTE error for proposals containing null byte characters", () => {
            const ProposalNullByte: AgentProposal = {
                schema_version: "1.0.0",
                id: "00000000-0000-0000-0000-000000000001",
                reasoning: "Write a short project status note.",
                action: ActionType.WRITE_FILE,
                args: {
                    path: "/sandbox/notes/status.md",
                    content: "Sprint complete.\0"
                }
            };

            const ExpectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: ProposalNullByte,
                ErrorId: ProposalErrorCode.NULL_BYTE,
                args: { message: "Cannot contain null byte characters" }
            };

            expect(ValidateProposal(ProposalNullByte)).toEqual(ExpectedError);
        });

        it("should pass for proposals with no null bytes", () => {
            const ValidProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "00000000-0000-0000-0000-000000000002",
                reasoning: "A clean proposal with no null bytes.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(ValidProposal)).toBeUndefined();
        });
    });

    // ── ValidateASCII ─────────────────────────────────────────────────────────
    describe("ValidateASCII", () => {

        it("should return INVALID_ASCII error for proposals with non-ASCII characters", () => {
            const InvalidASCIIProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "00000000-0000-0000-0000-000000000003",
                reasoning: "Invalid character:",
                action: ActionType.WRITE_FILE,
                args: {path: "/sandbox/notes/status.md",
                    content: "Sprint complete.\x01"}
            };

            const ExpectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: InvalidASCIIProposal,
                ErrorId: ProposalErrorCode.INVALID_ASCII,
                args: { message: "Cannot contain invalid ASCII characters" }
            };

            expect(ValidateProposal(InvalidASCIIProposal)).toEqual(ExpectedError);
        });

        it("should pass for proposals containing only valid ASCII characters", () => {
            const ValidASCIIProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "00000000-0000-0000-0000-000000000004",
                reasoning: "All valid ASCII characters here.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(ValidASCIIProposal)).toBeUndefined();
        });
    });

    // ── validatePayloadSize ───────────────────────────────────────────────────
    describe("validatePayloadSize", () => {

        it("should return PAYLOAD_OVERFLOW error for proposals exceeding the size limit", () => {
            const OversizedProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "00000000-0000-0000-0000-000000000005",
                reasoning: "A".repeat(1026),
                action: ActionType.THINK,
                args: {}
            };
            const ProposalBytes = new TextEncoder().encode(JSON.stringify(OversizedProposal)).byteLength;

            const ExpectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: OversizedProposal,
                ErrorId: ProposalErrorCode.PAYLOAD_OVERFLOW,
                args: {
                    size: ProposalBytes,
                    limit: proposal_limit,
                    message: "Payload exceeds maximum size of 1024 characters"
                }
            };

            expect(ValidateProposal(OversizedProposal)).toEqual(ExpectedError);
        });

        it("should pass for proposals within the size limit", () => {
            const SmallProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "00000000-0000-0000-0000-000000000006",
                reasoning: "Short proposal.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(SmallProposal)).toBeUndefined();
        });
    });

    // ── ValidateIDCollision ───────────────────────────────────────────────────
    describe("ValidateIDCollision", () => {

        it("should return ID_COLLISION error for proposals with a previously seen ID", () => {
            fs.writeFileSync(config.ID_LOG_PATH, TEST_UUID + "\n");

            const ProposalWithIDCollision: AgentProposal = {
                schema_version: "1.0.0",
                id: TEST_UUID,
                reasoning: "This proposal has a colliding ID.",
                action: ActionType.THINK,
                args: {}
            };

            const ExpectedError = {
                schema_version: "1.0.0",
                id: expect.any(String),
                input: ProposalWithIDCollision,
                ErrorId: ProposalErrorCode.ID_COLLISION,
                args: {
                    incoming: TEST_UUID,
                    message: "ID matches with previously logged proposal ID"
                }
            };

            expect(ValidateProposal(ProposalWithIDCollision)).toEqual(ExpectedError);
        });

        it("should pass for proposals with a unique ID not in the log", () => {
            const UniqueIDProposal: AgentProposal = {
                schema_version: "1.0.0",
                id: "00000000-0000-0000-0000-000000000008",
                reasoning: "This proposal has a fresh unique ID.",
                action: ActionType.THINK,
                args: {}
            };

            expect(ValidateProposal(UniqueIDProposal)).toBeUndefined();
        });
    });

    // ── ValidateCoreStructure ─────────────────────────────────────────────────
    // describe("ValidateCoreStructure", () => {

    //     it("should return MISSING_CONTENT error for proposals with an incorrect schema version", () => {
    //         const WrongVersionProposal: AgentProposal = {
    //             schema_version: "2.0.0",
    //             id: "",
    //             reasoning: "Wrong schema version.",
    //             action: ActionType.THINK,
    //             args: {}
    //         };

    //         const ExpectedError = {
    //             schema_version: "1.0.0",
    //             id: expect.any(String),
    //             input: WrongVersionProposal,
    //             ErrorId: ProposalErrorCode.MISSING_CONTENT,
    //             args: {
    //                 field: ["id","schema_version"].join(", "),
    //                 message: "Required field is missing or incorrectly formatted"
    //             }
    //         };

    //         expect(ValidateProposal(WrongVersionProposal)).toEqual(ExpectedError);
    //     });

    //     it("should pass for a fully valid proposal", () => {
    //         const ValidProposal: AgentProposal = {
    //             schema_version: "1.0.0",
    //             id: "00000000-0000-0000-0000-000000000009",
    //             reasoning: "This proposal is fully valid.",
    //             action: ActionType.THINK,
    //             args: {}
    //         };

    //         expect(ValidateProposal(ValidProposal)).toBeUndefined();
    //     });
    // });

});
