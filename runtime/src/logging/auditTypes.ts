export interface AuditEvent {
    // === Trace & Identity ===
    trace_id: string;
    step_index: number;
  
    // === Proposal Info ===
    proposal_id: string | null;
    schema_version: string | null;
    action: string | null;
    args_summary: string | null;
    reasoning: string | null;
  
    // === Decision ===
    authorized: boolean | null;
  
    // === Outcome ===
    outcome: "SUCCESS" | "DENIED" | "VALIDATION_ERROR" | "EXECUTION_ERROR";
    error_code: string | null;
    phase_failed_at: string | null;
  
    // === Timing ===
    received_at: string;
    completed_at: string;
  
    // === Optional execution detail ===
    execution_result?: string | null;
  }

  export interface RunHeader {
    record_type: "run_header";
    run_id: string;
    run_started_at: string;
  }
  
  export interface RunFooter {
    record_type: "run_footer";
    run_id: string;
    run_completed_at: string;
  }
  
  export interface AuditEventRecord extends AuditEvent {
    record_type: "audit_event";
  }
