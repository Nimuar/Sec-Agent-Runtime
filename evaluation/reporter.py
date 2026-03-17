import os
import datetime
from evaluation.models import PipelineResult, ClassifiedLogEntry

def generate_report(entries: list[ClassifiedLogEntry], result: PipelineResult, output_path: str) -> str:
    """
    Generates a Markdown report from the evaluation results and writes it to disk.
    Uses pre-classified log entries to ensure consistency and efficiency.
    
    Args:
        entries: List of pre-classified log entries.
        result: Aggregated metrics.
        output_path: Path to save the .md report.
        
    Returns:
        The generated Markdown report as a string.
    """
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    lines = [
        "# Evaluation Report",
        "",
        f"_Generated: {timestamp}_",
        "",
        "---",
        "",
        "## Summary",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Total Entries | {result.total_entries} |",
        f"| True Positives (TP) | {result.true_positives} |",
        f"| True Negatives (TN) | {result.true_negatives} |",
        f"| False Positives (FP) | {result.false_positives} |",
        f"| False Negatives (FN) | {result.false_negatives} |",
        f"| System Faults (SF) | {result.system_faults} |",
        f"| False Positive Rate | {f'{result.false_positive_rate:.4f}' if result.false_positive_rate is not None else 'N/A'} |",
        f"| False Negative Rate | {f'{result.false_negative_rate:.4f}' if result.false_negative_rate is not None else 'N/A'} |",
        f"| Mean Step Latency | {result.mean_step_latency_ms:.2f} ms |",
        f"| System Fault Rate | {result.system_fault_rate:.4f} |",
        "",
        "---",
        "",
        "## Classification Breakdown",
        "",
        "| Step | Action | Outcome | Intent | Classification |",
        "|------|--------|---------|--------|----------------|",
    ]
    
    for item in entries:
        entry = item.entry
        intent = item.intent
        classification = item.classification
        action_name = entry.action if entry.action else "N/A"
        lines.append(f"| {entry.step_index} | {action_name} | {entry.outcome.value} | {intent} | {classification.value} |")
        
    lines.extend([
        "",
        "---",
        "",
        "## Alerts",
        "",
    ])
    
    alerts_triggered = False
    if result.false_negative_rate is not None and result.false_negative_rate > 0:
        lines.append("> [!CAUTION]")
        lines.append(f"> **False Negatives Detected.** {result.false_negatives} malicious action(s) were incorrectly allowed. FNR: {result.false_negative_rate:.4f}")
        alerts_triggered = True
        
    if result.system_fault_rate > 0:
        lines.append("> [!WARNING]")
        lines.append(f"> **System Faults Detected.** {result.system_faults} step(s) resulted in infrastructure errors. Fault Rate: {result.system_fault_rate:.4f}")
        alerts_triggered = True
        
    if not alerts_triggered:
        lines.append("> [!NOTE]")
        lines.append("> No critical issues detected.")
        
    report_content = "\n".join(lines)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_content)
        
    return report_content
