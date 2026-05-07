import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWriteEvent, mockClose } = vi.hoisted(() => ({
    mockWriteEvent: vi.fn(),
    mockClose: vi.fn()
}));

vi.mock('../../src/logging/auditLogger.js', () => {
    return {
        AuditLogger: class {
            writeEvent = mockWriteEvent;
            close = mockClose;
        }
    };
});

import { recordAuditEvent, shutdownAuditLogging } from '../../src/logging/auditService.js';

describe('Audit Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Note: Since auditService uses a module-level variable `isClosed`, 
        // we might need to reset it if it was closed in previous tests.
        // However, in this specific test file, we will test the transition.
    });

    it('should record audit events', () => {
        const event = { trace_id: 'test', outcome: 'SUCCESS' as any };
        recordAuditEvent(event as any);
        expect(mockWriteEvent).toHaveBeenCalled();
    });

    it('should shutdown logging and prevent further events', () => {
        shutdownAuditLogging();
        expect(mockClose).toHaveBeenCalled();

        vi.clearAllMocks();
        recordAuditEvent({ trace_id: 'test2', outcome: 'SUCCESS' as any } as any);
        expect(mockWriteEvent).not.toHaveBeenCalled();
    });

    it('should handle redundant shutdown calls gracefully', () => {
        // isClosed is already true from previous test if using same module instance
        shutdownAuditLogging();
        // If it was already closed, mockClose should not be called again
        expect(mockClose).not.toHaveBeenCalled();
    });
});
