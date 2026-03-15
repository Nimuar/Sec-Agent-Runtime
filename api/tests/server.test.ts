import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
const { mockDispatchAction } = vi.hoisted(() => {
  return { mockDispatchAction: vi.fn() };
});

vi.mock("../../runtime/src/actions/dispatcher.js", () => ({
  dispatchAction: mockDispatchAction,
}));

import { app } from "../src/server.js";

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
    const proposal = { ...validProposal, id: "550e8400-e29b-41d4-a716-446655440000" };
    mockDispatchAction.mockResolvedValue({
      proposal_id: proposal.id,
      action: "THINK",
      outcome: "SUCCESS",
      result: { observation: "Still thinking" },
      error: null
    });

    const response = await request(app)
      .post("/execute")
      .send(proposal);

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
    const proposal = { ...validProposal, id: "550e8400-e29b-41d4-a716-446655440010" };
    mockDispatchAction.mockResolvedValue({
      proposal_id: proposal.id,
      action: "THINK",
      outcome: "EXECUTION_ERROR",
      result: null,
      error: { error_code: "EXECUTION_ERROR", message: "Failed" }
    });

    const response = await request(app)
      .post("/execute")
      .send(proposal);

    expect(response.status).toBe(200);
    expect(response.body.outcome).toBe("EXECUTION_ERROR");
  });

  it("should return 500 for unhandled server exceptions", async () => {
    const proposal = { ...validProposal, id: "550e8400-e29b-41d4-a716-446655440020" };
    mockDispatchAction.mockRejectedValue(new Error("Database down"));

    const response = await request(app)
      .post("/execute")
      .send(proposal);

    expect(response.status).toBe(500);
    expect(response.body.outcome).toBe("EXECUTION_ERROR");
    expect(response.body.error.error_code).toBe("FATAL_SERVER_ERROR");
  });

  it("should return 400 VALIDATION_ERROR for proposal with extra fields (Strict Schema)", async () => {
    const maliciousProposal = {
      ...validProposal,
      id: "550e8400-e29b-41d4-a716-446655440030",
      malicious_payload: "rm -rf /"
    };

    const response = await request(app)
      .post("/execute")
      .send(maliciousProposal);

    expect(response.status).toBe(400);
    expect(response.body.outcome).toBe("VALIDATION_ERROR");
    expect(response.body.error.message.toLowerCase()).toContain("unrecognized");
    expect(mockDispatchAction).not.toHaveBeenCalled();
  });

  it("should return 400 for payload exceeding 1024 bytes (DoS Vector)", async () => {
    const largeReasoning = "A".repeat(1025);
    const largeProposal = {
      ...validProposal,
      id: "550e8400-e29b-41d4-a716-446655440040",
      reasoning: largeReasoning
    };

    const response = await request(app)
      .post("/execute")
      .send(largeProposal);

    expect(response.status).toBe(400);
    // Express returns 400 for 'request entity too large' when limit is hit in express.json
    expect(response.body.error.error_code).toBe("INVALID_JSON");
    expect(response.body.error.message).toContain("limit");
  });

  it("should return 400 for duplicate proposal ID (ID Collision)", async () => {
    const proposal = { ...validProposal, id: "550e8400-e29b-41d4-a716-446655440050" };
    mockDispatchAction.mockResolvedValue({
      proposal_id: proposal.id,
      action: "THINK",
      outcome: "SUCCESS",
      result: null,
      error: null
    });

    // First request
    await request(app).post("/execute").send(proposal);
    
    // Second request with same ID
    const response = await request(app)
      .post("/execute")
      .send(proposal);

    expect(response.status).toBe(400);
    expect(response.body.outcome).toBe("VALIDATION_ERROR");
    expect(response.body.error.error_code).toBe("ID_COLLISION");
    expect(mockDispatchAction).toHaveBeenCalledTimes(1); // Only called once
  });
});
