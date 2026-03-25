import { AuditLogger } from "./auditLogger.js";
import type { AuditEvent } from "./auditTypes.js";

const auditLogger = new AuditLogger();
let globalStepIndex = 0;
let isClosed = false;

function closeAuditLogger(): void {
  if (isClosed) return;
  auditLogger.close();
  isClosed = true;
}

process.on("exit", closeAuditLogger);
process.on("SIGINT", closeAuditLogger);
process.on("SIGTERM", closeAuditLogger);

export function recordAuditEvent(
  event: Omit<AuditEvent, "step_index">
): void {
  auditLogger.writeEvent({
    ...event,
    step_index: globalStepIndex++,
  });
}

export function shutdownAuditLogging(): void {
  closeAuditLogger();
}
