import { describe, it, expect } from "vitest";
import { ValidateProposal } from "./Proposal_Handler.js";
import { filter,TEST_UUID,proposal_limit } from "../../sys-common/schemas/ProposalErrorConfig.js";

import { de } from "zod/v4/locales";
import { config } from "node:process";

// This test suite validates the error handling logic of the Proposal Handler, specifically for proposals containing null byte characters. It checks that the correct error response is generated and that the error message is accurate. The test uses a predefined UUID for consistency in testing.
describe("Proposal Handler Validation Tests", () => {
    //Invalid Test Case 
    it("should return an error for proposals containing null byte characters", () => {
        const proposalNullByte = {
  "schema_version": "1.0.0",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "reasoning": "Write a short project status note to a safe sandbox path. \0",
  "action": "WRITE_FILE",
  "args": {
    "path": "/sandbox/notes/status.md",
    "content": "Sprint complete. Next step is handler integration tests."
  }
};

        const expectedError = {
            schema_version: "1.0.0",
            id: expect.any(String), // The ID should be a string (UUID)
            input: JSON.stringify(proposalNullByte),
            ErrorId: filter.NULL_BYTE,
            args: {
                message: "Cannot contain null byte characters"
            }
        };

        const result = ValidateProposal(proposalNullByte);
        expect(result).toEqual(expectedError);
    });

    it("should return an error for proposals containing invalid ASCII Characters", () => {
        const invalidASCIIProposal = "This proposal contains an invalid ASCII character: \x01";
        
        const expectedError = {
            schema_version: "1.0.0",
            id: expect.any(String), // The ID should be a string (UUID)
            input: invalidASCIIProposal,
            ErrorId: filter.INVALID_ASCII,
            args: {
                message: "Cannot contain invalid ASCII characters"
            }
        };

        const result = ValidateProposal(invalidASCIIProposal);
        expect(result).toEqual(expectedError);
    });

    it("should return an error for proposals exceeding the payload size limit", () => {
        const oversizedProposal = "A".repeat(1026); // Create a proposal that exceeds the 1024 character limit
        
        const expectedError = {
            schema_version: "1.0.0",
            id: expect.any(String), // The ID should be a string (UUID)
            input: oversizedProposal,
            ErrorId: filter.PAYLOAD_OVERFLOW,
            args: {
                size: oversizedProposal.length, // Actual size in bytes
                limit: proposal_limit, // Limit from config
                message: "Payload exceeds maximum size of 1024 characters"
            }
        };

        const result = ValidateProposal(oversizedProposal);
        expect(result).toEqual(expectedError);
    });

    it("should return an error for proposals with ID collisions", () => {
        const proposalWithIDCollision = "This proposal has an ID that collides with a previously logged proposal.";
        
        const expectedError = {
            schema_version: "1.0.0",
            id: expect.any(String), // The ID should be a string (UUID)
            input: proposalWithIDCollision,
            ErrorId: filter.ID_COLLISION,
            args: {
                incoming: TEST_UUID, // ID from the incoming proposal
                message: "ID matches with previously logged proposal ID"
            }
        };

        const result = ValidateProposal(proposalWithIDCollision);
        expect(result).toEqual(expectedError);
    });
    //Valid Test Cases


});