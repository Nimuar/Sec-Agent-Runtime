import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Use vi.hoisted for variables used in vi.mock
const { mockProcessStep } = vi.hoisted(() => ({
    mockProcessStep: vi.fn()
}));

vi.mock('../../src/stepRuntime.js', () => ({
    processStep: mockProcessStep
}));

// Import app AFTER mocks
import { app } from '../../src/server.js';

describe('Server Edge Cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Quota Management', () => {
        it('should transition from PROMPT to ABORT when quota is exceeded', async () => {
            const proposal = {
                schema_version: "1.0.0",
                id: "550e8400-e29b-41d4-a716-446655440000",
                reasoning: "Test quota",
                action: "THINK",
                args: {}
            };

            // Set up mock to return PROMPT containment
            mockProcessStep.mockResolvedValue({
                outcome: "EXECUTION_ERROR",
                result: { containment: "PROMPT" }
            });

            const sessionId = "test-session-" + Date.now();

            // Send 4 requests (quota is 5)
            for (let i = 0; i < 4; i++) {
                const res = await request(app)
                    .post("/execute")
                    .set("x-agent-session-id", sessionId)
                    .send(proposal);
                expect(res.status).toBe(409);
                expect(res.body.result.containment).toBe("PROMPT");
            }

            // The 5th request should trigger ABORT
            const res5 = await request(app)
                .post("/execute")
                .set("x-agent-session-id", sessionId)
                .send(proposal);
            
            expect(res5.status).toBe(500);
            expect(res5.body.result.containment).toBe("ABORT");
        });
    });

    describe('Error Handling', () => {
        it('should hit next(err) for non-JSON errors', async () => {
            // Mock processStep to throw an unexpected error
            mockProcessStep.mockRejectedValue(new Error("Unexpected crash"));

            const res = await request(app)
                .post("/execute")
                .send({
                    schema_version: "1.0.0",
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    reasoning: "Trigger error",
                    action: "THINK",
                    args: {}
                });

            // Express default error handler returns 500
            expect(res.status).toBe(500);
        });
    });
});
