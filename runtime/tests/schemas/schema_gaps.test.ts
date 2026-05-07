import { describe, it, expect } from 'vitest';
import { AgentProposalSchema } from '../../src/schemas/ProposalSchema.js';
import { GateList } from '../../src/schemas/ProposalErrorSchema.js';
import { GetExecutionOutcome, ExecutionErrorId, ExecutionOutcome } from '../../src/schemas/ExecutionRegistry.js';
import { ActionType } from '../../src/schemas/ActionTypeRegistry.js';
import { ProposalErrorCode } from '../../src/schemas/ProposalErrorRegistry.js';

describe('Schema & Registry Gaps', () => {
    describe('AgentProposalSchema', () => {
        it('should generate a default ID if missing', () => {
            const proposal = {
                schema_version: "1.0.0",
                reasoning: "Missing ID test",
                action: ActionType.THINK,
                args: {}
            };
            const result = AgentProposalSchema.safeParse(proposal);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBeDefined();
                expect(result.data.id).toMatch(/^[0-9a-f-]{36}$/i);
            }
        });
    });

    describe('GateList (ProposalErrorSchema)', () => {
        it('should generate a default ID if missing', () => {
            const error = {
                schema_version: "1.0.0",
                input: "some input",
                ErrorId: ProposalErrorCode.NULL_BYTE,
                args: { message: "Cannot contain null byte characters" }
            };
            const result = GateList.safeParse(error);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBeDefined();
            }
        });

        it('should reject empty input in ErrorSchema', () => {
            const error = {
                schema_version: "1.0.0",
                id: "550e8400-e29b-41d4-a716-446655440000",
                input: "", // empty string
                ErrorId: ProposalErrorCode.NULL_BYTE,
                args: { message: "Cannot contain null byte characters" }
            };
            const result = GateList.safeParse(error);
            expect(result.success).toBe(false);
        });
    });

    describe('ExecutionRegistry - GetExecutionOutcome', () => {
        it('should return RETRY for READ_FILE + FILE_NOT_FOUND override', () => {
            const outcome = GetExecutionOutcome(ActionType.READ_FILE, ExecutionErrorId.FILE_NOT_FOUND);
            expect(outcome).toBe(ExecutionOutcome.RETRY);
        });

        it('should return RETRY for LIST_FILES + PATH_NOT_FOUND override', () => {
            const outcome = GetExecutionOutcome(ActionType.LIST_FILES, ExecutionErrorId.PATH_NOT_FOUND);
            expect(outcome).toBe(ExecutionOutcome.RETRY);
        });

        it('should fall back to OUTCOME_MAP or PROMPT', () => {
            // UNKNOWN_ERROR is in OUTCOME_MAP as PROMPT
            expect(GetExecutionOutcome(ActionType.THINK, ExecutionErrorId.UNKNOWN_ERROR)).toBe(ExecutionOutcome.PROMPT);
            
            // Testing the || ExecutionOutcome.PROMPT fallback by passing an unmapped key if possible
            // Since we use enum, we can cast to test the branch
            expect(GetExecutionOutcome(ActionType.THINK, "NON_EXISTENT" as any)).toBe(ExecutionOutcome.PROMPT);
        });
    });
});
