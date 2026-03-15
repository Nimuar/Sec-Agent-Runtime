import express, { Request, Response } from "express";
import { AgentProposalSchema } from "../../sys-common/schemas/ProposalSchema.js";
import { dispatchAction } from "../../runtime/src/actions/dispatcher.js";

const app = express();
app.use(express.json());

// JSON Parse Error Handler (Rule L87: "Invalid JSON format")
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      outcome: "VALIDATION_ERROR",
      error: {
        error_code: "INVALID_JSON",
        message: "Invalid JSON format"
      }
    });
  }
  next();
});

app.post("/execute", async (req: Request, res: Response) => {
  try {
    // Phase 1 & 2: Receive and Parse (handled by express.json)
    
    // Phase 3 & 4 & 5: Validate
    const parsed = AgentProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        outcome: "VALIDATION_ERROR",
        error: {
          error_code: "INVALID_CONTENT",
          message: parsed.error.issues[0]?.message ?? "Invalid proposal format"
        }
      });
    }

    const proposal = parsed.data;

    // TODO: Phase 3 (Authorization)

    // Phase 7: Execute
    const executionResult = await dispatchAction(proposal.id, proposal.action as any, proposal.args);

    // TODO: Phase 5 (Audit Recording)

    // Phase 9: Respond
    return res.status(200).json(executionResult);

  } catch (err) {
    // Fatal Exception Interception (Rule 4)
    return res.status(500).json({
      outcome: "EXECUTION_ERROR",
      error: {
        error_code: "FATAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : "Internal Server Error"
      }
    });
  }
});

const PORT = 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "localhost", () => {
    // console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export { app };
