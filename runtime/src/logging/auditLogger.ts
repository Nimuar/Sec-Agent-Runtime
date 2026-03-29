import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  AuditEvent,
  AuditEventRecord,
  RunFooter,
  RunHeader,
} from "./auditTypes";

const LOG_DIR = process.env.AUDIT_LOG_DIR || path.join(process.cwd(), "logs");

function ensureLogDirExists(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function generateRunId(): string {
  ensureLogDirExists();
  return crypto.randomUUID();
}

export class AuditLogger {
  public readonly runId: string;
  public readonly filePath: string;

  constructor() {
    ensureLogDirExists();

    this.runId = generateRunId();
    this.filePath = path.join(LOG_DIR, `audit_run_${this.runId}.jsonl`);

    const header: RunHeader = {
      record_type: "run_header",
      run_id: this.runId,
      run_started_at: new Date().toISOString(),
    };

    fs.appendFileSync(this.filePath, JSON.stringify(header) + "\n", "utf8");
  }

  async writeEvent(event: AuditEvent): Promise<void> {
  const record: AuditEventRecord = {
    record_type: "audit_event",
    ...event,
  };

  await fs.promises.appendFile(
    this.filePath,
    JSON.stringify(record) + "\n",
    "utf8"
  );
}

  async close(): Promise<void> {
  const footer: RunFooter = {
    record_type: "run_footer",
    run_id: this.runId,
    run_completed_at: new Date().toISOString(),
  };

  await fs.promises.appendFile(
    this.filePath,
    JSON.stringify(footer) + "\n",
    "utf8"
  );
}
