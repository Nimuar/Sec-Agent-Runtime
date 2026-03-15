import express, { Request, Response } from "express";
import { AgentProposalSchema } from "../../sys-common/schemas/ProposalSchema.js";
import { dispatchAction } from "../../runtime/src/actions/dispatcher.js";

const app = express();
app.use(express.json({ limit: '1024b' }));

let globalStepIndex = 0;

// JSON Parse & Limit Error Handler (Rule L87: "Invalid JSON format")
app.use((err: any, req: Request, res: Response, next: any) => {
  const isParseError = err instanceof SyntaxError && "body" in err;
  const isLimitError = err.type === 'entity.too.large';

  if (isParseError || isLimitError) {
    return res.status(400).json({
      proposal_id: null,
      action: null,
      outcome: "VALIDATION_ERROR",
      error: {
        error_code: "INVALID_JSON",
        message: isLimitError ? "Payload exceeds 1024-byte limit" : "Invalid JSON format"
      }
    });
  }
  next();
});

app.post("/execute", async (req: Request, res: Response) => {
  const receivedAt = new Date().toISOString();
  const stepIndex = globalStepIndex++;
  
  // Phase 1: RECEIVE
  const stepContext = {
    step_index: stepIndex,
    received_at: receivedAt,
    raw_payload: JSON.stringify(req.body)
  };

  try {
    // Phase 3 & 4 & 5: VALIDATE
    const parsed = AgentProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorResponse = {
        proposal_id: (req.body as any)?.id || null,
        action: (req.body as any)?.action || null,
        outcome: "VALIDATION_ERROR",
        error: {
          error_code: "INVALID_CONTENT",
          message: parsed.error.issues[0]?.message ?? "Invalid proposal format"
        }
      };
      // Phase 8: RECORD (Failure)
      console.log(`[RECORD] Step ${stepIndex} failed validation: ${errorResponse.error.message}`);
      return res.status(400).json(errorResponse);
    }

    const proposal = parsed.data;

    // Phase 6: AUTHORIZE (Sandbox Boundary Enforcement)
    // Note: Zod schema already enforces /sandbox/ prefix and extensions via refiners.
    // Here we perform final canonicalization/verification if needed.
    console.log(`[AUTHORIZE] Step ${stepIndex} authorized for ${proposal.action}`);

    // Phase 7: EXECUTE
    const executionResult = await dispatchAction(proposal.id, proposal.action as any, proposal.args);

    // Phase 8: RECORD (Success)
    console.log(`[RECORD] Step ${stepIndex} executed: ${proposal.action} -> ${executionResult.outcome}`);

    // Phase 9: RESPOND
    return res.status(200).json(executionResult);

  } catch (err) {
    // Fatal Exception Interception (Rule 4)
    const fatalResponse = {
      proposal_id: (req.body as any)?.id || null,
      action: (req.body as any)?.action || null,
      outcome: "EXECUTION_ERROR",
      result: null,
      error: {
        error_code: "FATAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : "Internal Server Error"
      }
    };
    console.log(`[RECORD] Step ${stepIndex} fatal error: ${fatalResponse.error.message}`);
    return res.status(500).json(fatalResponse);
  }
});

const PORT = 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "localhost", () => {
    // console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export { app };
