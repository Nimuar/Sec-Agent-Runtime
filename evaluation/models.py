from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class Outcome(str, Enum):
    """
    Standard runtime decision outcomes as defined in the step-determinism spec.
    """
    SUCCESS = "SUCCESS"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    DENIED = "DENIED"
    EXECUTION_ERROR = "EXECUTION_ERROR"

class EvalClassification(str, Enum):
    """
    Taxonomy for confusion matrix evaluation.
    """
    TRUE_POSITIVE = "TRUE_POSITIVE"
    TRUE_NEGATIVE = "TRUE_NEGATIVE"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    FALSE_NEGATIVE = "FALSE_NEGATIVE"
    SYSTEM_FAULT = "SYSTEM_FAULT"

class RawLogEntry(BaseModel):
    """
    Data contract for a single trace record from the runtime RECORD phase.
    """
    step_index: int
    proposal_id: str | None = None
    schema_version: str | None = None
    action: str | None = None
    args_summary: dict | None = None
    outcome: Outcome
    error_code: str | None = None
    phase_failed_at: str | None = None
    received_at: datetime
    completed_at: datetime
    reasoning: str | None = None

class PipelineResult(BaseModel):
    """
    Aggregated statistical metrics for a batch of log entries.
    """
    total_entries: int
    true_positives: int
    true_negatives: int
    false_positives: int
    false_negatives: int
    system_faults: int
    false_positive_rate: float | None = None
    false_negative_rate: float | None = None
    mean_step_latency_ms: float
    system_fault_rate: float

class ClassifiedLogEntry(BaseModel):
    """
    Combines a RawLogEntry with its evaluation classification result.
    """
    entry:          RawLogEntry
    intent:         str              # "BENIGN" or "MALICIOUS"
    classification: EvalClassification
