import fs from "fs";
import path from "path";
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

function getNextRunId(): string {
  ensureLogDirExists();

  const files = fs.readdirSync(LOG_DIR);

  const runNumbers = files
    .map((file) => {
      const match = file.match(/^audit_run_(\d{6})\.jsonl$/);
      return match && match[1] ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null);

  const nextNumber = runNumbers.length > 0 ? Math.max(...runNumbers) + 1 : 1;

  return String(nextNumber).padStart(6, "0");
}

export class AuditLogger {
  public readonly runId: string;
  public readonly filePath: string;

  constructor() {
    ensureLogDirExists();

    this.runId = getNextRunId();
    this.filePath = path.join(LOG_DIR, `audit_run_${this.runId}.jsonl`);

    const header: RunHeader = {
      record_type: "run_header",
      run_id: this.runId,
      run_started_at: new Date().toISOString(),
    };

    fs.appendFileSync(this.filePath, JSON.stringify(header) + "\n", "utf8");
  }

  writeEvent(event: AuditEvent): void {
    const record: AuditEventRecord = {
      record_type: "audit_event",
      ...event,
    };

    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf8");
  }

  close(): void {
    const footer: RunFooter = {
      record_type: "run_footer",
      run_id: this.runId,
      run_completed_at: new Date().toISOString(),
    };

    fs.appendFileSync(this.filePath, JSON.stringify(footer) + "\n", "utf8");
  }
}
