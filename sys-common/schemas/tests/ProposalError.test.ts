import { describe, it, expect, should } from "vitest";
import { GateList } from "../ProposalErrorSchema.js";
import { ProposalErrorCode } from "../ProposalErrorRegistry.js";

// Test UUID 
const TEST_UUID = "00000000-0000-0000-0000-000000000000";



describe("Gate Schema Validation", () => {

    //Valid Tests
    it("Should accept an invalid NULL_BYTE response", () => {
        const validError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Original proposal that failed validation",
            ErrorId: ProposalErrorCode.NULL_BYTE,
            args: {
                message: "Cannot contain null byte characters"
            }
        };
        const result = GateList.safeParse(validError);
        expect(result.success).toBe(true);
    });

    it("Should accept a INVALID_ASCII Error response", () => {
        const validError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Original proposal that failed validation",
            ErrorId: ProposalErrorCode.INVALID_ASCII,
            args: {
                message: "Cannot contain invalid ASCII characters"
            }
        };
        const result = GateList.safeParse(validError);
        expect(result.success).toBe(true);
    });

    it("Should accept a PAYLOAD_OVERFLOW Error response", () => {
        const validError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Original proposal that failed validation",
            ErrorId: ProposalErrorCode.PAYLOAD_OVERFLOW,
            args: {
                size: 2048,
                limit: 1024,
                message: "Payload exceeds maximum size of 1024 characters"
            }
        };
        const result = GateList.safeParse(validError);
        expect(result.success).toBe(true);
    });

    it("Should accept an ID_COLLISION Error response", () => {
        const validError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Original proposal that failed validation",
            ErrorId: ProposalErrorCode.ID_COLLISION,
            args: {
                incoming: TEST_UUID,
                backlog: TEST_UUID,
                message: "ID matches with previously logged proposal ID"
            }
        };
        const result = GateList.safeParse(validError);
        expect(result.success).toBe(true);
    });

    it("Should accept a MISSING_CONTENT Error response", () => {
        const validError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Original proposal that failed validation",
            ErrorId: ProposalErrorCode.MISSING_CONTENT,
            args: {
                field: "reasoning",
                message: "Required field is missing or empty"
            }
        };
        const result = GateList.safeParse(validError);
        expect(result.success).toBe(true);
    });
    it("Should accept a INVALID_CONTENT Error response", () => {
        const validError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Original proposal that failed validation",
            ErrorId: ProposalErrorCode.INVALID_CONTENT,
            args: {
                field: "reasoning",
                message: "Required field is Invalid"
            }
        };
        const result = GateList.safeParse(validError);
        expect(result.success).toBe(true);
    });

    //Invalid Tests
    it("should fail if schema_version is wrong format", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "v1.0", // Invalid schema_version format
            input: "Invalid Verison Format",
            ErrorId: ProposalErrorCode.NULL_BYTE,
            args: {
                message: "Cannot contain null byte characters"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });
    it("should fail if 'id' is not a valid UUID", () => {
        const invalidError = {
            id: "invalid-uuid",
            schema_version: "1.0.0",
            input: "Invalid UUID Format",
            ErrorId: ProposalErrorCode.NULL_BYTE,
            args: {
                message: "Cannot contain null byte characters"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });

    it("should fail if 'input' is empty", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "", // Empty input
            ErrorId: ProposalErrorCode.NULL_BYTE,
            args: {
                message: "Cannot contain null byte characters"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });

    it("should fail if ErrorId is invalid", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Invalid ErrorId",
            ErrorId: "UNKNOWN_ERROR", // Invalid ErrorId
            args: {
                message: "This is an unknown error type"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });

    it("Should fail if args are wrong for Payload overflow", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Invalid args for PAYLOAD_OVERFLOW",
            ErrorId: ProposalErrorCode.PAYLOAD_OVERFLOW,
            args: {
                size: "2048", // Should be a number, not a string
                limit: "1024",
                message: "Payload exceeds maximum size of 1024 characters"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });
    it("Should fail if args are missing for Payload overflow", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Invalid args for PAYLOAD_OVERFLOW",
            ErrorId: ProposalErrorCode.PAYLOAD_OVERFLOW,
            args: {
                limit: "",
                message: "Payload exceeds maximum size of 1024 characters"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });
    it("Should fail if args are wrong for ID_COLLISION", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Invalid args for ID_COLLISION",
            ErrorId: ProposalErrorCode.ID_COLLISION,
            args: {
                incoming: "not-a-uuid", // Should be a valid UUID
                backlog: "also-not-a-uuid",
                message: "ID matches with previously logged proposal ID"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });
    it("Should fail if args are missing for ID_COLLISION", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Invalid args for ID_COLLISION",
            ErrorId: ProposalErrorCode.ID_COLLISION,
            args: {

                backlog: "",
                message: "ID matches with previously logged proposal ID"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });
    it("Should fail if data type is wrong for MISSING_CONTENT", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Invalid args for MISSING_CONTENT",
            ErrorId: ProposalErrorCode.MISSING_CONTENT,
            args: {
                field: 123, // Should be a string, not a number
                message: "Required field is missing or empty"
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });
    it("Should fail if data type is missing for MISSING_CONTENT", () => {
        const invalidError = {
            id: TEST_UUID,
            schema_version: "1.0.0",
            input: "Invalid args for MISSING_CONTENT",
            ErrorId: ProposalErrorCode.MISSING_CONTENT,
            args: {
            }
        };
        const result = GateList.safeParse(invalidError);
        expect(result.success).toBe(false);
    });
});