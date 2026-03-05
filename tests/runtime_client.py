import json
import subprocess
import os

class RuntimeClient:
    """Client for executing payloads against the compiled Node.js Subprocess runtime."""
    
    def __init__(self, node_script_path: str = "runtime/dist/index.js", cwd: str = None):
        """
        Initializes the RuntimeClient.
        Args:
            node_script_path: Path to the compiled Node.js index script.
            cwd: The working directory for the subprocess, usually the root of the project.
        """
        self.node_script_path = node_script_path
        self.cwd = cwd or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    def execute(self, payload: dict | str) -> dict:
        """
        Executes a JSON payload against the Node.js runtime via STDIN.
        
        Args:
            payload: Formatted dictionary or invalid string representation of a payload.
            
        Returns:
            dict: The parsed JSON response (`RuntimeResponse` schema) from the Node script.
            If the response isn't valid JSON, it returns a dict wrapping an EXECUTION_ERROR.
        """
        if isinstance(payload, dict):
            payload_str = json.dumps(payload)
        else:
            payload_str = str(payload)
            
        try:
            # We use `npx tsx runtime/src/index.ts` or `node runtime/dist/index.js`
            # The codebase doesn't have `dist/` explicitly right now, we will use tsx if needed.
            # Assuming compiled node:
            process = subprocess.run(
                ["npx", "tsx", "runtime/src/index.ts"],
                input=payload_str,
                capture_output=True,
                text=True,
                cwd=self.cwd,
                shell=True
            )
            
            # The stdout should be purely the JSON response
            stdout_out = process.stdout.strip()
            
            if not stdout_out:
                return {
                    "outcome": "EXECUTION_ERROR",
                    "error_code": "EMPTY_STDOUT",
                    "stderr": process.stderr, 
                    "stdout": process.stdout
                }
                
            return json.loads(stdout_out)
            
        except json.JSONDecodeError as e:
            return {
                "outcome": "EXECUTION_ERROR",
                "error_code": "INVALID_JSON_RESPONSE",
                "raw_response": stdout_out,
                "error": str(e)
            }
        except Exception as e:
            return {
                "outcome": "EXECUTION_ERROR",
                "error_code": "SUBPROCESS_EXCEPTION",
                "error": str(e)
            }
