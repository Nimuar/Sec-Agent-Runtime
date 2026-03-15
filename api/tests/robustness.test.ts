import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
const { mockDispatchAction } = vi.hoisted(() => {
  return { mockDispatchAction: vi.fn() };
});

vi.mock("../../runtime/src/actions/dispatcher.js", () => ({
  dispatchAction: mockDispatchAction,
}));

import { app } from "../src/server.js";

describe("API Boundary Robustness", () => {
  const validProposal = {
    schema_version: "1.0.0",
    id: "550e8400-e29b-41d4-a716-446655440000",
    reasoning: "Robustness check",
    action: "THINK",
    args: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Method & Header Spoofing", () => {
    it("should return 404 for GET /execute", async () => {
      const response = await request(app).get("/execute");
      expect(response.status).toBe(404);
    });

    it("should reject POST /execute with incorrect Content-Type", async () => {
      // express.raw with type: 'application/json' will not populate req.body if Content-Type is text/plain
      const response = await request(app)
        .post("/execute")
        .set("Content-Type", "text/plain")
        .send(JSON.stringify(validProposal));
      
      // If req.body is empty, validateReceive throws MISSING_CONTENT (400)
      expect(response.status).toBe(400);
      expect(response.body.outcome).toBe("VALIDATION_ERROR");
      expect(response.body.error.error_code).toBe("MISSING_CONTENT");
    });
  });

  describe("Concurrency & Race Conditions", () => {
    it("should handle simultaneous requests and increment step indexes", async () => {
      mockDispatchAction.mockResolvedValue({
        proposal_id: "uuid",
        action: "THINK",
        outcome: "SUCCESS",
        result: {},
        error: null
      });

      const concurrentRequests = Array.from({ length: 10 }).map(() => 
        request(app)
          .post("/execute")
          .set("Content-Type", "application/json")
          .send(JSON.stringify(validProposal))
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.outcome).toBe("SUCCESS");
      });

      // Verification of atomic increments is hard via API without exposing step_index 
      // but we can at least verify they all succeeded without race condition crashes.
      expect(mockDispatchAction).toHaveBeenCalledTimes(10);
    });
  });

  describe("Stalled Execution", () => {
    it("should not crash when an action is slow", async () => {
      // Mock a slow action
      mockDispatchAction.mockImplementation(() => new Promise((resolve) => {
        setTimeout(() => resolve({
          proposal_id: "uuid",
          action: "THINK",
          outcome: "SUCCESS",
          result: { delayed: true },
          error: null
        }), 500);
      }));

      const response = await request(app)
        .post("/execute")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(validProposal));

      expect(response.status).toBe(200);
      expect(response.body.outcome).toBe("SUCCESS");
      expect(response.body.result.delayed).toBe(true);
    });
  });
});
