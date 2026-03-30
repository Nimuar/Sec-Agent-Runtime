import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { 
  processStep
} from "./stepRuntime.js";

const app = express();

const sessionQuota = new Map<string, number>();

app.post("/execute", express.raw({ type: 'application/json', limit: '1024b' }), async (req: Request, res: Response) => {
  const traceId = crypto.randomUUID();
  const rawPayload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

  console.log(`[RECEIVE] Incoming request: ${traceId}`);

  const response = await processStep(rawPayload, traceId);

  const QUOTA_LIMIT = 5;
  const sessionId = (req.headers["x-agent-session-id"] as string) ?? "default";
  let quotaCost = sessionQuota.get(sessionId) ?? 0;

  // Map outcome to status code
  let statusCode = 500;
  if (response.outcome === "SUCCESS") {
    statusCode = 200;
  } else if (response.outcome === "EXECUTION_ERROR") {
    let containment = response.result?.containment;

    //Updates prompt and abort outcomes based on containment.
    if (containment === "PROMPT") {
      quotaCost += 1; // Deduct one credit for bad prompts
      sessionQuota.set(sessionId, quotaCost);
      if (quotaCost >= QUOTA_LIMIT) {
        containment = "ABORT"; // If quota is exceeded force abort
        response.result!.containment = "ABORT";
      }
    }
    if (containment === "ABORT")  sessionQuota.delete(sessionId);
    if (containment === "RETRY")  statusCode = 200;
    if (containment === "PROMPT") statusCode = 409;
    if (containment === "ABORT")  statusCode = 500;
  } else if (response.outcome === "VALIDATION_ERROR" || response.outcome === "DENIED") {
    statusCode = 400;
  }

  return res.status(statusCode).json(response);
});

// JSON Parse & Limit Error Handler (Rule L87: "Invalid JSON format")
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const isParseError = err instanceof SyntaxError && "body" in err;
  const isLimitError = err.type === 'entity.too.large';

  if (isParseError || isLimitError) {
    return res.status(400).json({
      proposal_id: null,
      action: null,
      outcome: "VALIDATION_ERROR",
      error: {
        error_code: isLimitError ? "PAYLOAD_OVERFLOW" : "INVALID_JSON",
        message: isLimitError ? "Payload exceeds 1024-byte limit" : "Invalid JSON format"
      }
    });
  }
  next(err);
});

const PORT = 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "localhost", () => {
    // console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export { app };
