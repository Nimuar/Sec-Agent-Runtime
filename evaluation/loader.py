import json
from pydantic import ValidationError
from evaluation.models import RawLogEntry

def load_log_entries(file_path: str) -> list[RawLogEntry]:
    """
    Reads a .jsonl file and returns a list of RawLogEntry objects.
    
    Args:
        file_path: Path to the .jsonl file.
        
    Returns:
        A list of validated RawLogEntry objects.
        
    Raises:
        ValueError: If JSON or schema validation fails.
        FileNotFoundError: If the file does not exist.
    """
    entries = []
    with open(file_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                data = json.loads(line)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON on line {i}: {e}")
            
            try:
                entries.append(RawLogEntry(**data))
            except ValidationError as e:
                raise ValueError(f"Schema validation failed on line {i}: {e}")
                
    return entries
