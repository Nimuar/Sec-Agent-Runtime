// whitelist of the 4 things the agent can do.

export enum ActionType {
  THINK = "THINK",
  FINISH = "FINISH",

  // Basic Filesystem
  READ_FILE = "READ_FILE",
  WRITE_FILE = "WRITE_FILE",
  LIST_FILES = "LIST_FILES",
  CREATE_DIRECTORY = "CREATE_DIRECTORY",

  // High Risk / Destructive
  DELETE_FILE = "DELETE_FILE",
  RENAME_FILE = "RENAME_FILE"
}
