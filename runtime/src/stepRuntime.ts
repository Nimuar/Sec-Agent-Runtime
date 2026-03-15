import { z } from "zod";
import path from "path";

import { AgentProposalSchema, AgentProposal } from "../../sys-common/schemas/ProposalSchema.js";
import { ActionType } from "../../sys-common/schemas/ActionTypeRegistry.js";
import { RuntimeResponse } from "../../sys-common/schemas/ExecutionContracts.js";
import { dispatchAction } from "./actions/dispatcher.js";

/**
 * Assumptions:
 * 1. already updated ExecutionContracts.ts so that:
 *    - RequestOutcome includes "VALIDATION_ERROR"
 *    - RuntimeResponse.proposal_id is string | null
 *    - RuntimeResponse.action is ActionType | null
 *
 * 2. This file implements the step lifecycle:
 *    RECEIVE -> PARSE -> VALIDATE_SCHEMA -> VALIDATE_ACTION -> VALIDATE_ARGS
 *    -> AUTHORIZE -> EXECUTE -> RECORD -> RESPOND
 */

type Phase =
  | "RECEIVE"
  | "PARSE"
  | "VALIDATE_SCHEMA"
  | "VALIDATE_ACTION"
  | "VALIDATE_ARGS"
  | "AUTHORIZE"
  | "EXECUTE"
  | "RECORD"
  | "RESPOND";

type StepContext = {
  step_index: number;
  raw_payload: string;
  received_at: string;
  completed_at: string | null;

  proposal_id: string | null;
  schema_version: string | null;
  reasoning: string | null;
  action: ActionType | null;
  args: Record<string, unknown> | null;

  outcome: RuntimeResponse["outcome"] | null;
  result: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  phase_failed_at: Phase | null;
};

const SUPPORTED_MAJOR = 1;
const MAX_PAYLOAD_CHARS = 1024;
const SANDBOX_ROOT = "/sandbox";

/**
 * Top-level schema only.
 * This lets us separate:
 * - VALIDATE_SCHEMA
 * - VALIDATE_ACTION
 * - VALIDATE_ARGS
 */
const TopLevelProposalSchema = z
  .object({
    schema_version: z.string().regex(/^1\.\d+\.\d+$/),
    id: z.string().uuid(),
    reasoning: z.string().min(1),
    action: z.string(),
    args: z.record(z.string(), z.unknown()),
  })
  .strict();

class ValidationError extends Error {
  readonly phase: Phase;
  readonly code: string;

  constructor(phase: Phase, code: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.phase = phase;
    this.code = code;
  }
}

class PolicyError extends Error {
  readonly phase: Phase;
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PolicyError";
    this.phase = "AUTHORIZE";
    this.code = code;
  }
}

function createStepContext(rawPayload: string, stepIndex: number): StepContext {
  return {
    step_index: stepIndex,
    raw_payload: rawPayload,
    received_at: new Date().toISOString(),
    completed_at: null,

    proposal_id: null,
    schema_version: null,
    reasoning: null,
    action: null,
    args: null,

    outcome: null,
    result: null,
    error_code: null,
    error_message: null,
    phase_failed_at: null,
  };
}

function validateReceive(rawPayload: string): void {
  if (rawPayload.trim().length === 0) {
    throw new ValidationError(
      "RECEIVE",
      "MISSING_CONTENT",
      "Required field is missing or empty"
    );
  }

  if (rawPayload.length > MAX_PAYLOAD_CHARS) {
    throw new ValidationError(
      "RECEIVE",
      "PAYLOAD_OVERFLOW",
      `Payload exceeds maximum size of ${MAX_PAYLOAD_CHARS} characters`
    );
  }

  if (rawPayload.includes("\0")) {
    throw new ValidationError(
      "RECEIVE",
      "NULL_BYTE",
      "Cannot contain null byte characters"
    );
  }
}

function parseProposal(rawPayload: string): unknown {
  try {
    return JSON.parse(rawPayload);
  } catch {
    throw new ValidationError("PARSE", "INVALID_JSON", "Invalid JSON format");
  }
}

function validateSchemaPhase(parsed: unknown) {
  const result = TopLevelProposalSchema.safeParse(parsed);

  if (!result.success) {
    const firstIssue = result.error.issues[0];

    throw new ValidationError(
      "VALIDATE_SCHEMA",
      "INVALID_CONTENT",
      firstIssue?.message ?? "Top-level proposal schema is invalid"
    );
  }

  const major = Number(result.data.schema_version.split(".")[0]);
  if (major !== SUPPORTED_MAJOR) {
    throw new ValidationError(
      "VALIDATE_SCHEMA",
      "SCHEMA_VERSION_INCOMPATIBLE",
      "Unsupported proposal schema version."
    );
  }

  return result.data;
}

function validateActionPhase(action: string): ActionType {
  if (!Object.values(ActionType).includes(action as ActionType)) {
    throw new PolicyError(
      "ACTION_NOT_ALLOWED",
      `Action ${action} is not allowed in the runtime allowlist`
    );
  }

  return action as ActionType;
}

function validateArgsPhase(
  topLevelProposal: z.infer<typeof TopLevelProposalSchema>
): AgentProposal {
  const result = AgentProposalSchema.safeParse(topLevelProposal);

  if (!result.success) {
    const firstIssue = result.error.issues[0];

    throw new ValidationError(
      "VALIDATE_ARGS",
      "INVALID_CONTENT",
      firstIssue?.message ?? "Action arguments are invalid"
    );
  }

  return result.data;
}

function normalizeSandboxPath(p: string): string {
  const normalized = path.posix.normalize(p);

  // normalize('/sandbox/../etc') => '/etc'
  // normalize('/sandbox/a/../../b') => '/b'
  if (!normalized.startsWith(`${SANDBOX_ROOT}/`) && normalized !== SANDBOX_ROOT) {
    throw new PolicyError(
      "POLICY_VIOLATION",
      "Path must remain within /sandbox/"
    );
  }

  if (normalized.includes("\0")) {
    throw new PolicyError(
      "POLICY_VIOLATION",
      "Path contains illegal null byte characters"
    );
  }

  return normalized;
}

function authorizeProposal(proposal: AgentProposal): void {
  switch (proposal.action) {
    case ActionType.THINK:
    case ActionType.FINISH:
      return;

    case ActionType.READ_FILE:
    case ActionType.WRITE_FILE:
    case ActionType.DELETE_FILE:
    case ActionType.LIST_FILES:
    case ActionType.CREATE_DIRECTORY: {
      normalizeSandboxPath(proposal.args.path);
      return;
    }

    case ActionType.RENAME_FILE: {
      normalizeSandboxPath(proposal.args.source);
      normalizeSandboxPath(proposal.args.destination);
      return;
    }

    default: 
      return
  }
}

function hydrateContextFromProposal(
  ctx: StepContext,
  proposal: AgentProposal
): void {
  ctx.proposal_id = proposal.id;
  ctx.schema_version = proposal.schema_version;
  ctx.reasoning = proposal.reasoning;
  ctx.action = proposal.action;
  ctx.args = proposal.args as Record<string, unknown>;
}

function applyDeterministicError(ctx: StepContext, err: unknown): void {
  if (err instanceof ValidationError) {
    ctx.phase_failed_at = err.phase;
    ctx.outcome = "VALIDATION_ERROR";
    ctx.error_code = err.code;
    ctx.error_message = err.message;
    ctx.result = null;
    return;
  }

  if (err instanceof PolicyError) {
    ctx.phase_failed_at = err.phase;
    ctx.outcome = "DENIED";
    ctx.error_code = err.code;
    ctx.error_message = err.message;
    ctx.result = null;
    return;
  }

  ctx.phase_failed_at = "EXECUTE";
  ctx.outcome = "EXECUTION_ERROR";
  ctx.error_code = "EXECUTION_ERROR";
  ctx.error_message = err instanceof Error ? err.message : "Execution failed";
  ctx.result = null;
}

function recordStep(ctx: StepContext): void {
  ctx.completed_at = new Date().toISOString();

  const traceRecord = {
    step_index: ctx.step_index,
    proposal_id: ctx.proposal_id,
    schema_version: ctx.schema_version,
    action: ctx.action,
    args_summary: ctx.args,
    outcome: ctx.outcome,
    error_code: ctx.error_code,
    phase_failed_at: ctx.phase_failed_at,
    received_at: ctx.received_at,
    completed_at: ctx.completed_at,
    reasoning: ctx.reasoning, // audit only
  };

  // Minimal implementation for now
  console.log("[TRACE]", JSON.stringify(traceRecord, null, 2));
}

function buildResponse(ctx: StepContext): RuntimeResponse {
  return {
    proposal_id: ctx.proposal_id,
    action: ctx.action,
    outcome: ctx.outcome ?? "EXECUTION_ERROR",
    result: ctx.result,
    error:
      ctx.error_code && ctx.error_message
        ? {
            error_code: ctx.error_code,
            message: ctx.error_message,
          }
        : null,
  };
}

/**
 * Process one proposal through the entire lifecycle.
 */
export async function processStep(
  rawPayload: string,
  stepIndex: number
): Promise<RuntimeResponse> {
  const ctx = createStepContext(rawPayload, stepIndex);

  try {
    // RECEIVE
    validateReceive(rawPayload);

    // PARSE
    const parsed = parseProposal(rawPayload);

    // VALIDATE_SCHEMA
    const topLevelProposal = validateSchemaPhase(parsed);

    // Save fields as soon as top-level schema is valid
    ctx.proposal_id = topLevelProposal.id;
    ctx.schema_version = topLevelProposal.schema_version;
    ctx.reasoning = topLevelProposal.reasoning;
    ctx.args = topLevelProposal.args;

    // VALIDATE_ACTION
    const validatedAction = validateActionPhase(topLevelProposal.action);
    ctx.action = validatedAction;

    // VALIDATE_ARGS
    const validatedProposal = validateArgsPhase({
      ...topLevelProposal,
      action: validatedAction,
    });

    hydrateContextFromProposal(ctx, validatedProposal);

    // AUTHORIZE
    authorizeProposal(validatedProposal);

    // EXECUTE
    const response = await dispatchAction(
        validatedProposal.id,
        validatedProposal.action,
        validatedProposal.args
      );
      
      if (response.outcome === "EXECUTION_ERROR") {
        ctx.phase_failed_at = "EXECUTE";
      }
      
      if (response.outcome === "DENIED") {
        ctx.phase_failed_at = "AUTHORIZE";
      }

    ctx.outcome = response.outcome;
    ctx.result = response.result;
    ctx.error_code = response.error?.error_code ?? null;
    ctx.error_message = response.error?.message ?? null;
  } catch (err) {
    applyDeterministicError(ctx, err);
  }

  // RECORD
  recordStep(ctx);

  // RESPOND
  return buildResponse(ctx);
}

/**
 * Runtime loop:
 * repeatedly fetch proposals, process each step,
 * and stop on FINISH or maxSteps or no more proposals.
 */
export async function runRuntime(
  fetchNextProposal: () => Promise<string | null>,
  maxSteps = 25
): Promise<RuntimeResponse[]> {
  const responses: RuntimeResponse[] = [];
  let stepIndex = 0;
  let terminated = false;

  while (!terminated && stepIndex < maxSteps) {
    const rawPayload = await fetchNextProposal();

    if (rawPayload === null) {
      break;
    }

    stepIndex += 1;

    const response = await processStep(rawPayload, stepIndex);
    responses.push(response);

    if (response.action === ActionType.FINISH && response.outcome === "SUCCESS") {
      terminated = true;
    }
  }

  return responses;
}