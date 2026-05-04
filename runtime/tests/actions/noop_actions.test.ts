import { describe, it, expect } from 'vitest';
import { think } from '../../src/actions/think.js';
import { finish } from '../../src/actions/finish.js';
import { ActionType } from '../../src/schemas/ActionTypeRegistry.js';

describe('No-Op Actions', () => {
    describe('think', () => {
        it('should return SUCCESS for think action', async () => {
            const response = await think('1', {});
            expect(response.outcome).toBe('SUCCESS');
            expect(response.action).toBe(ActionType.THINK);
        });
    });

    describe('finish', () => {
        it('should return SUCCESS and echo response for finish action', async () => {
            const response = await finish('1', { response: 'all done' });
            expect(response.outcome).toBe('SUCCESS');
            expect(response.action).toBe(ActionType.FINISH);
            expect(response.result.final_response).toBe('all done');
        });
    });
});
