import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { 
  processStep
} from "./stepRuntime.js";

const app = express();

let quotaCost = 0;

app.post("/execute", express.raw({ type: 'application/json', limit: '1024b' }), async (req: Request, res: Response) => {
  const traceId = crypto.randomUUID();
  const rawPayload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

  console.log(`[RECEIVE] Incoming request: ${traceId}`);

  const response = await processStep(rawPayload, traceId);

  //Implement quota logic 
  const containment = response.result?.containment || null; // Extract response information from response if available
  if (quotaCost >= 5) { 
    containment == "ABORT"; // Force abort if quota is exceeded
  }

  // Map outcome to status code
  let statusCode = 500;
  if (response.outcome === "SUCCESS") {
    quotaCost += response.outcome === "SUCCESS" ? 1 : 0; // Charge for successful execution, not for execution errors
    statusCode = 200;
  }else if(response.outcome === "EXECUTION_ERROR") {
    if (containment === "RETRY") {
      statusCode = 200; //Passing code for retry as it is an error we want to correct. 
    } else if (containment === "PROMPT") {
      quotaCost += 1; // Charge for errors that require agent reassessment
      statusCode = 409; // Random error code because the request was processed successfully, even if the action failed
    }
    else if (containment === "ABORT") {
      quotaCost = 0; // Reset quota on abort-level errors
      statusCode = 500; // Could not process the request
    }
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
