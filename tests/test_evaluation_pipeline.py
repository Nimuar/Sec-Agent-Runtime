import pytest
import os
from evaluation.models import RawLogEntry, Outcome, EvalClassification
from evaluation.loader import load_log_entries
from evaluation.classifier import classify, classify_entries
from evaluation.engine import compute_metrics
from evaluation.reporter import generate_report

MOCK_FILE = os.path.join(os.path.dirname(__file__), "mock_data", "mock_audit.jsonl")
REPORT_OUTPUT = os.path.join(os.path.dirname(__file__), "results", "mock_metrics_report_test.md")

class TestEvaluationPipeline:
    
    def test_load_entries_count(self):
        """Verify the loader reads exactly 20 entries."""
        entries = load_log_entries(MOCK_FILE)
        assert len(entries) == 20
        
    def test_load_entries_types(self):
        """Verify every object is a RawLogEntry with correct field mapping."""
        entries = load_log_entries(MOCK_FILE)
        for entry in entries:
            assert isinstance(entry, RawLogEntry)
            assert entry.received_at < entry.completed_at
            
    def test_classify_true_negative(self):
        """Test classification of benign SUCCESS entries (TN)."""
        entries = load_log_entries(MOCK_FILE)
        # Entry 1 is benign READ_FILE -> SUCCESS
        assert classify(entries[0]) == EvalClassification.TRUE_NEGATIVE
        
    def test_classify_true_positive(self):
        """Test classification of malicious blocked entries (TP)."""
        entries = load_log_entries(MOCK_FILE)
        # Entry 6 is sandbox escape -> DENIED
        assert classify(entries[5]) == EvalClassification.TRUE_POSITIVE
        # Entry 11 is malformed -> VALIDATION_ERROR (R5)
        assert classify(entries[10]) == EvalClassification.TRUE_POSITIVE
        
    def test_classify_false_negative(self):
        """Test classification of malicious allowed entries (FN)."""
        entries = load_log_entries(MOCK_FILE)
        # Entry 17 is sandbox escape -> SUCCESS
        assert classify(entries[16]) == EvalClassification.FALSE_NEGATIVE
        
    def test_classify_system_fault(self):
        """Test classification of execution errors (SF)."""
        entries = load_log_entries(MOCK_FILE)
        # Entry 19 is EXECUTION_ERROR
        assert classify(entries[18]) == EvalClassification.SYSTEM_FAULT
        
    def test_compute_metrics_math(self):
        """Verify the final aggregated math against the mock data."""
        raw_entries = load_log_entries(MOCK_FILE)
        classified_entries = classify_entries(raw_entries)
        result = compute_metrics(classified_entries)
        
        # Breakdown from mock data:
        # TN: 5 (1, 2, 3, 4, 5)
        # TP: 7 (6, 7, 8, 9, 10, 11, 12)
        # FP: 4 (13, 14, 15, 16)
        # FN: 2 (17, 18)
        # SF: 2 (19, 20)
        
        assert result.total_entries == 20
        assert result.true_positives == 7
        assert result.true_negatives == 5
        assert result.false_positives == 4
        assert result.false_negatives == 2
        assert result.system_faults == 2
        
        # FPR = FP / (FP + TN) = 4 / (4 + 5) = 4/9 ≈ 0.444
        assert pytest.approx(result.false_positive_rate, 0.001) == 4/9
        
        # FNR = FN / (FN + TP) = 2 / (2 + 7) = 2/9 ≈ 0.222
        assert pytest.approx(result.false_negative_rate, 0.001) == 2/9
        
        # All latencies in mock data are exactly 50ms
        assert result.mean_step_latency_ms == 50.0
        
        # Fault Rate = 2 / 20 = 0.1
        assert result.system_fault_rate == 0.1

    def test_report_generation(self):
        """Verify Markdown report generation and contents using pre-classified entries."""
        raw_entries = load_log_entries(MOCK_FILE)
        classified_entries = classify_entries(raw_entries)
        result = compute_metrics(classified_entries)
        
        report = generate_report(classified_entries, result, REPORT_OUTPUT)
        
        assert os.path.exists(REPORT_OUTPUT)
        assert "# Evaluation Report" in report
        assert "| Metric | Value |" in report
        assert "## Classification Breakdown" in report
        assert "> [!CAUTION]" in report  # FNR is > 0 in mock data
        assert "False Negatives Detected" in report
        assert "> [!WARNING]" in report  # SF is > 0 in mock data
        assert "System Faults Detected" in report
