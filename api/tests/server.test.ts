import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";

// We must mock the module BEFORE importing the app that depends on it.
jest.unstable_mockModule("../../runtime/src/actions/dispatcher.js", () => ({
  dispatchAction: jest.fn(),
}));

// Dynamically import dependencies after mocking
const { app } = await import("../src/server.js");
const dispatcher = await import("../../runtime/src/actions/dispatcher.js");
const { dispatchAction } = dispatcher as any;

describe("Agent Execution API", () => {
  const validProposal = {
    schema_version: "1.0.0",
    id: "550e8400-e29b-41d4-a716-446655440000",
    reasoning: "Thinking about something",
    action: "THINK",
    args: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 SUCCESS for a valid proposal", async () => {
    dispatchAction.mockResolvedValue({
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
    expect(dispatchAction).toHaveBeenCalledTimes(1);
  });

  it("should return 400 VALIDATION_ERROR for malformed JSON", async () => {
    const response = await request(app)
      .post("/execute")
      .send({ invalid: "data" });

    expect(response.status).toBe(400);
    expect(response.body.outcome).toBe("VALIDATION_ERROR");
    expect(dispatchAction).not.toHaveBeenCalled();
  });

  it("should return 200 and bubble up EXECUTION_ERROR from dispatcher", async () => {
    dispatchAction.mockResolvedValue({
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
    dispatchAction.mockRejectedValue(new Error("Database down"));

    const response = await request(app)
      .post("/execute")
      .send(validProposal);

    expect(response.status).toBe(500);
    expect(response.body.outcome).toBe("EXECUTION_ERROR");
    expect(response.body.error.error_code).toBe("FATAL_SERVER_ERROR");
  });
});
