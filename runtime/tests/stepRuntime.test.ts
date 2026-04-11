import { describe, it, expect, vi } from "vitest";
import { 
  validateReceive, 
  authorizeProposal, 
  applyDeterministicError, 
  hydrateContextFromProposal,
  createStepContext,
  ValidationError,
  PolicyError
} from "../src/stepRuntime.js";
import { StepContext } from "../src/stepRuntime.js";

describe("stepRuntime Core Logic", () => {
  
  describe("validateReceive", () => {
    it("should accept a valid JSON string within limits", () => {
      const payload = JSON.stringify({
        schema_version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440000",
        reasoning: "To test the system.",
        action: "THINK",
        args: { message: "Hello" }
      });
      expect(() => validateReceive(payload)).not.toThrow();
    });

    it("should reject payload exceeding 1024 characters", () => {
      const largePayload = "a".repeat(1025);
      const result = validateReceive(largePayload);
      expect(result).toBeDefined();
      expect(result?.ErrorId).toBe("PAYLOAD_OVERFLOW");
    });

    it("should reject payload with null bytes", () => {
      const payloadWithNull = '{"action": "THINK\0"}';
      const result = validateReceive(payloadWithNull);
      expect(result).toBeDefined();
      expect(result?.ErrorId).toBe("NULL_BYTE");
    });

  });

  describe("authorizeProposal", () => {
    const mockContext = (): StepContext => createStepContext("", "test-trace");

    it("should allow paths strictly inside /sandbox/", () => {
      const proposal = {
        schema_version: "1.0.0",
        id: "uuid",
        reasoning: "reason",
        action: "READ_FILE",
        args: { path: "/sandbox/file.txt" }
      };
      expect(() => authorizeProposal(proposal as any)).not.toThrow();
    });

    it("should reject paths outside /sandbox/", () => {
      const proposal = {
        schema_version: "1.0.0",
        id: "uuid",
        reasoning: "reason",
        action: "READ_FILE",
        args: { path: "/etc/passwd" }
      };
      expect(() => authorizeProposal(proposal as any)).toThrow(PolicyError);
    });

    it("should reject directory traversal attempts", () => {
      const proposal = {
        schema_version: "1.0.0",
        id: "uuid",
        reasoning: "reason",
        action: "READ_FILE",
        args: { path: "/sandbox/../secrets.txt" }
      };
      expect(() => authorizeProposal(proposal as any)).toThrow(PolicyError);
    });

    // Windows ADS test (even on non-windows, the logic should catch the string pattern if implemented)
    it("should reject Windows Alternative Data Streams", () => {
      const proposal = {
        schema_version: "1.0.0",
        id: "uuid",
        reasoning: "reason",
        action: "WRITE_FILE",
        args: { path: "/sandbox/file.txt::$DATA" }
      };
      // Currently our Zod schema handles .txt/.md extensions, but authorizeProposal provides an extra layer.
      expect(() => authorizeProposal(proposal as any)).toThrow(PolicyError);
    });

    it("should reject DOS device names", () => {
      const proposal = {
        schema_version: "1.0.0",
        id: "uuid",
        reasoning: "reason",
        action: "WRITE_FILE",
        args: { path: "/sandbox/CON.txt" }
      };
      expect(() => authorizeProposal(proposal as any)).toThrow(PolicyError);
    });

    it("should reject unrecognized actions (fail-closed)", () => {
      const proposal = {
        schema_version: "1.0.0",
        id: "uuid",
        reasoning: "reason",
        action: "UNAUTHORIZED_ACTION",
        args: {}
      };
      try {
        authorizeProposal(proposal as any);
        expect.fail("Should have thrown PolicyError");
      } catch (e: any) {
        expect(e).toBeInstanceOf(PolicyError);
        expect(e.code).toBe("ACTION_NOT_RECOGNIZED");
      }
    });
  });

  describe("applyDeterministicError", () => {
    it("should map ValidationError to VALIDATION_ERROR", () => {
      const ctx = createStepContext("", "test-trace");
      const err = new ValidationError("PARSE", "TEST_CODE", "test message");
      applyDeterministicError(ctx, err);
      expect(ctx.outcome).toBe("VALIDATION_ERROR");
      expect(ctx.error_code).toBe("TEST_CODE");
      expect(ctx.phase_failed_at).toBe("PARSE");
    });

    it("should map SyntaxError to VALIDATION_ERROR with INVALID_JSON", () => {
      const ctx = createStepContext("", "test-trace");
      const err = new SyntaxError("Unexpected token");
      applyDeterministicError(ctx, err);
      expect(ctx.outcome).toBe("VALIDATION_ERROR");
      expect(ctx.error_code).toBe("INVALID_JSON");
      expect(ctx.phase_failed_at).toBe("PARSE");
    });

    it("should map PolicyError to DENIED", () => {
      const ctx = createStepContext("", "test-trace");
      const err = new PolicyError("DENIED_PATH", "test policy");
      applyDeterministicError(ctx, err);
      expect(ctx.outcome).toBe("DENIED");
      expect(ctx.error_code).toBe("DENIED_PATH");
      expect(ctx.phase_failed_at).toBe("AUTHORIZE");
    });

    it("should map generic Error to EXECUTION_ERROR", () => {
      const ctx = createStepContext("", "test-trace");
      const err = new Error("Something went wrong");
      applyDeterministicError(ctx, err);
      expect(ctx.outcome).toBe("EXECUTION_ERROR");
      expect(ctx.phase_failed_at).toBe("EXECUTE");
    });
  });

  describe("hydrateContextFromProposal", () => {
    it("should populate context fields from proposal", () => {
      const ctx = createStepContext("", "test-trace");
      const proposal = {
        id: "uuid-123",
        schema_version: "1.0.0",
        reasoning: "reasoning",
        action: "THINK",
        args: { foo: "bar" }
      };
      hydrateContextFromProposal(ctx, proposal as any);
      expect(ctx.proposal_id).toBe("uuid-123");
      expect(ctx.action).toBe("THINK");
      expect(ctx.args).toEqual({ foo: "bar" });
    });
  });
});
