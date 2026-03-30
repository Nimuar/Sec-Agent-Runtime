import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

describe("AuditLogger", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-logger-test-"));
    process.env.AUDIT_LOG_DIR = tempDir;
  });

  afterEach(() => {
    delete process.env.AUDIT_LOG_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates a log file with a run_header on initialization", async () => {
    const { AuditLogger } = await import("./auditLogger");

    const logger = new AuditLogger();

    expect(logger.runId).toBeTruthy();
    expect(logger.filePath).toBeTruthy();
    expect(fs.existsSync(logger.filePath)).toBe(true);

    const content = fs.readFileSync(logger.filePath, "utf8").trim();
    const lines = content.split("\n");

    expect(lines.length).toBe(1);

    const header = JSON.parse(lines[0]!);
    expect(header.record_type).toBe("run_header");
    expect(header.run_id).toBe(logger.runId);
    expect(header.run_started_at).toBeTruthy();
  });

  it("appends an audit_event record when writeEvent is called", async () => {
    const { AuditLogger } = await import("./auditLogger");

    const logger = new AuditLogger();

    await logger.writeEvent({
      trace_id: "trace-1",
      proposal_id: "proposal-1",
      schema_version: "1.0.0",
      action: "THINK",
      args_summary: "{}",
      reasoning: "unit test event",
      authorized: true,
      outcome: "SUCCESS",
      error_code: null,
      phase_failed_at: null,
      received_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      execution_result: "{}",
      step_index: 0,
    });

    const content = fs.readFileSync(logger.filePath, "utf8").trim();
    const lines = content.split("\n");

    expect(lines.length).toBe(2);

    const eventRecord = JSON.parse(lines[1]!);
    expect(eventRecord.record_type).toBe("audit_event");
    expect(eventRecord.trace_id).toBe("trace-1");
    expect(eventRecord.action).toBe("THINK");
    expect(eventRecord.outcome).toBe("SUCCESS");
    expect(eventRecord.step_index).toBe(0);
  });

  it("appends multiple audit_event records in order", async () => {
    const { AuditLogger } = await import("./auditLogger");

    const logger = new AuditLogger();

    await logger.writeEvent({
      trace_id: "trace-1",
      proposal_id: "proposal-1",
      schema_version: "1.0.0",
      action: "THINK",
      args_summary: "{}",
      reasoning: "first",
      authorized: true,
      outcome: "SUCCESS",
      error_code: null,
      phase_failed_at: null,
      received_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      execution_result: "{}",
      step_index: 0,
    });

    await logger.writeEvent({
      trace_id: "trace-2",
      proposal_id: "proposal-2",
      schema_version: "1.0.0",
      action: "WRITE_FILE",
      args_summary: "{\"path\":\"/sandbox/a.txt\"}",
      reasoning: "second",
      authorized: true,
      outcome: "SUCCESS",
      error_code: null,
      phase_failed_at: null,
      received_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      execution_result: "{\"ok\":true}",
      step_index: 1,
    });

    const content = fs.readFileSync(logger.filePath, "utf8").trim();
    const lines = content.split("\n");

    expect(lines.length).toBe(3);

    const firstEvent = JSON.parse(lines[1]!);
    const secondEvent = JSON.parse(lines[2]!);

    expect(firstEvent.trace_id).toBe("trace-1");
    expect(firstEvent.step_index).toBe(0);
    expect(secondEvent.trace_id).toBe("trace-2");
    expect(secondEvent.step_index).toBe(1);
  });

  it("appends a run_footer record when close is called", async () => {
    const { AuditLogger } = await import("./auditLogger");

    const logger = new AuditLogger();

    await logger.close();

    const content = fs.readFileSync(logger.filePath, "utf8").trim();
    const lines = content.split("\n");

    expect(lines.length).toBe(2);

    const footer = JSON.parse(lines[1]!);
    expect(footer.record_type).toBe("run_footer");
    expect(footer.run_id).toBe(logger.runId);
    expect(footer.run_completed_at).toBeTruthy();
  });

  it("writes valid JSON lines for header, events, and footer", async () => {
    const { AuditLogger } = await import("./auditLogger");

    const logger = new AuditLogger();

    await logger.writeEvent({
      trace_id: "json-trace",
      proposal_id: "json-proposal",
      schema_version: "1.0.0",
      action: "THINK",
      args_summary: "{}",
      reasoning: "json test",
      authorized: true,
      outcome: "SUCCESS",
      error_code: null,
      phase_failed_at: null,
      received_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      execution_result: "{}",
      step_index: 0,
    });

    await logger.close();

    const lines = fs.readFileSync(logger.filePath, "utf8").trim().split("\n");

    expect(lines.length).toBe(3);

    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }

    const header = JSON.parse(lines[0]!);
    const event = JSON.parse(lines[1]!);
    const footer = JSON.parse(lines[2]!);

    expect(header.record_type).toBe("run_header");
    expect(event.record_type).toBe("audit_event");
    expect(footer.record_type).toBe("run_footer");
  });
});