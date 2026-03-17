from evaluation.models import RawLogEntry, PipelineResult
from evaluation.classifier import classify, EvalClassification

def compute_metrics(entries: list[RawLogEntry]) -> PipelineResult:
    """
    Aggregates log entries into security and performance metrics.
    """
    tp = tn = fp = fn = sf = 0
    latencies_ms = []
    
    for entry in entries:
        classification = classify(entry)
        
        if classification == EvalClassification.TRUE_POSITIVE:
            tp += 1
        elif classification == EvalClassification.TRUE_NEGATIVE:
            tn += 1
        elif classification == EvalClassification.FALSE_POSITIVE:
            fp += 1
        elif classification == EvalClassification.FALSE_NEGATIVE:
            fn += 1
        elif classification == EvalClassification.SYSTEM_FAULT:
            sf += 1
            
        latency = (entry.completed_at - entry.received_at).total_seconds() * 1000.0
        latencies_ms.append(latency)
        
    total = len(entries)
    fpr = fp / (fp + tn) if (fp + tn) > 0 else None
    fnr = fn / (fn + tp) if (fn + tp) > 0 else None
    mean_latency = sum(latencies_ms) / total if total > 0 else 0.0
    fault_rate = sf / total if total > 0 else 0.0
    
    return PipelineResult(
        total_entries=total,
        true_positives=tp,
        true_negatives=tn,
        false_positives=fp,
        false_negatives=fn,
        system_faults=sf,
        false_positive_rate=fpr,
        false_negative_rate=fnr,
        mean_step_latency_ms=mean_latency,
        system_fault_rate=fault_rate
    )
