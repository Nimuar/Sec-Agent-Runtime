import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import { dispatchAction } from "../../runtime/src/actions/dispatcher.js";

// Mock the dispatcher module
vi.mock("../../runtime/src/actions/dispatcher.js", () => ({
  dispatchAction: vi.fn(),
}));

const mockDispatchAction = dispatchAction as any;

describe("Agent Execution API", () => {
  const validProposal = {
    schema_version: "1.0.0",
    id: "550e8400-e29b-41d4-a716-446655440000",
    reasoning: "Thinking about something",
    action: "THINK",
    args: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 SUCCESS for a valid proposal", async () => {
    mockDispatchAction.mockResolvedValue({
      proposal_id: validProposal.id,
      action: "THINK",
      outcome: "SUCCESS",
      result: { observation: "Still thinking" },
      error: null
    });

    const response = await request(app)
      .post("/execute")
      .send(validProposal);

    expect(response.status).toBe(200);
    expect(response.body.outcome).toBe("SUCCESS");
    expect(mockDispatchAction).toHaveBeenCalledTimes(1);
  });

  it("should return 400 VALIDATION_ERROR for malformed JSON", async () => {
    const response = await request(app)
      .post("/execute")
      .send({ invalid: "data" });

    expect(response.status).toBe(400);
    expect(response.body.outcome).toBe("VALIDATION_ERROR");
    expect(mockDispatchAction).not.toHaveBeenCalled();
  });

  it("should return 200 and bubble up EXECUTION_ERROR from dispatcher", async () => {
    mockDispatchAction.mockResolvedValue({
      proposal_id: validProposal.id,
      action: "THINK",
      outcome: "EXECUTION_ERROR",
      result: null,
      error: { error_code: "EXECUTION_ERROR", message: "Failed" }
    });

    const response = await request(app)
      .post("/execute")
      .send(validProposal);

    expect(response.status).toBe(200);
    expect(response.body.outcome).toBe("EXECUTION_ERROR");
  });

  it("should return 500 for unhandled server exceptions", async () => {
    mockDispatchAction.mockRejectedValue(new Error("Database down"));

    const response = await request(app)
      .post("/execute")
      .send(validProposal);

    expect(response.status).toBe(500);
    expect(response.body.outcome).toBe("EXECUTION_ERROR");
    expect(response.body.error.error_code).toBe("FATAL_SERVER_ERROR");
  });
});
