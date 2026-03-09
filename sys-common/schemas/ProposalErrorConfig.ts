//Proposal Error handling limits and configurations
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

export const schema_version = "1.0.0"; // Schema version for error responses
export const log_schema_version = "1.0.0"; // Schema version for error logs
export const valid_ascii = /^[ -~]*$/; // Regex for valid ASCII characters
export const proposal_limit = 1024; // 1KB limit for proposal size
export const TEST_UUID = "00000000-0000-0000-0000-000000000000";


export let ERROR_LOG_PATH = resolve(__dirname, "../../logs/proposals.error.log");
export let ID_LOG_PATH = resolve(__dirname, "../../logs/proposals.id.log");





export enum LogSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH"
}//log types for logging errors - Only Expounding on Simple Error log for now.
