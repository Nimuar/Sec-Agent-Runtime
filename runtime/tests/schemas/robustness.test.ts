import { describe, it, expect } from "vitest";
import { AgentProposalSchema } from "../../src/schemas/ProposalSchema.js";
import { ActionType } from "../../src/schemas/ActionTypeRegistry.js";

describe("ProposalSchema Robustness", () => {
  const validBase = {
    schema_version: "1.0.0",
    id: "550e8400-e29b-41d4-a716-446655440000",
    reasoning: "Valid reasoning"
  };

  describe("Deep Nesting", () => {
    it("should handle deeply nested args without crashing (Stack Overflow Prevention)", () => {
      // Create a deeply nested object
      let nested: any = { leaf: true };
      for (let i = 0; i < 500; i++) {
        nested = { node: nested };
      }

      const proposal = {
        ...validBase,
        action: ActionType.THINK,
        args: nested
      };

      // Zod discriminatedUnion + strict() should handle this.
      // We are verifying it returns a validation error instead of throwing a stack overflow.
      const result = AgentProposalSchema.safeParse(proposal);
      expect(result.success).toBe(false);
    });
  });

  describe("Extreme Lengths", () => {
    it("should handle extremely long strings gracefully", () => {
      const longString = "A".repeat(100000);
      const proposal = {
        ...validBase,
        reasoning: longString,
        action: ActionType.THINK,
        args: {}
      };

      const result = AgentProposalSchema.safeParse(proposal);
      // Valid because reasoning just needs min(1), no max is defined in Zod (Express handles max chars).
      // But we verify it parses without hanging or memory explosion.
      expect(result.success).toBe(true);
    });
  });

  describe("Unicode Security", () => {
    it("should reject homoglyphs in action name", () => {
      // "RЕAD_FILE" with Cyrillic 'Е' (U+0415)
      const homoglyphAction = "R\u0415AD_FILE"; 
      const proposal = {
        ...validBase,
        action: homoglyphAction,
        args: { path: "/sandbox/test.txt" }
      };

      const result = AgentProposalSchema.safeParse(proposal);
      expect(result.success).toBe(false);
    });
  });
});
