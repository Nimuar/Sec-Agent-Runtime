import express, { Request, Response, NextFunction } from "express";
import { AgentProposalSchema } from "../../sys-common/schemas/ProposalSchema.js";
import { dispatchAction } from "../../runtime/src/actions/dispatcher.js";
import { 
  validateReceive, 
  authorizeProposal, 
  applyDeterministicError, 
  createStepContext, 
  buildResponse,
  ValidationError,
  hydrateContextFromProposal,
  recordStep
} from "../../runtime/src/stepRuntime.js";

const app = express();

let globalStepIndex = 0;


app.post("/execute", express.raw({ type: 'application/json', limit: '1024b' }), async (req: Request, res: Response) => {
  const stepIndex = globalStepIndex++;
  const rawPayload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

  // Phase 1 (Receive): Initialize Context & Basic Security
  const ctx = createStepContext(rawPayload, stepIndex);

  try {
    // Phase 1 (Receive) Continued: Security Barriers
    validateReceive(rawPayload);

    // Phase 2 (Validate): JSON & Schema
    const parsedJson = JSON.parse(rawPayload);
    const parsed = AgentProposalSchema.safeParse(parsedJson);

    if (!parsed.success) {
      throw new ValidationError("VALIDATE_ARGS", "INVALID_CONTENT", parsed.error.issues[0]?.message ?? "Invalid proposal format");
    }

    const proposal = parsed.data;
    hydrateContextFromProposal(ctx, proposal);

    // Phase 3 (Authorize): Sandbox Boundary
    authorizeProposal(proposal);
    console.log(`[AUTHORIZE] Step ${stepIndex} authorized for ${proposal.action}`);

    // Phase 4 (Execute): Action Dispatch
    const response = await dispatchAction(proposal.id, proposal.action as any, proposal.args);
    
    // Phase 8: RECORD (Update Context)
    ctx.outcome = response.outcome;
    ctx.result = response.result;
    ctx.error_code = response.error?.error_code ?? null;
    ctx.error_message = response.error?.message ?? null;

    // Phase 8: RECORD (Audit Log)
    recordStep(ctx);
    console.log(`[RECORD] Step ${stepIndex} executed: ${proposal.action} -> ${ctx.outcome}`);

    // Phase 9: RESPOND
    return res.status(200).json(buildResponse(ctx));

  } catch (err) {
    // Error Mapping (Rule 4 Enforcement)
    applyDeterministicError(ctx, err);
    recordStep(ctx);
    console.log(`[RECORD] Step ${stepIndex} error: ${ctx.error_message}`);

    const response = buildResponse(ctx);
    const statusCode = (ctx.outcome === "VALIDATION_ERROR" || ctx.outcome === "DENIED") ? 400 : 500;

    // Return 200 for cleanly handled EXECUTION_ERRORs (as per constraint)
    if (ctx.outcome === "EXECUTION_ERROR" && ctx.phase_failed_at === "EXECUTE") {
        return res.status(200).json(response);
    }

    return res.status(statusCode).json(response);
  }
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
