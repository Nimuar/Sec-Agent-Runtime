import { z } from "zod";
import { ActionType } from "./ActionTypeRegistry";

/**
 * Isomorphic utility to extract file extension.
 * Returns the extension without the dot (e.g., "txt" for "/foo/bar.txt").
 */
const getExt = (p: string) => p.slice((Math.max(0, p.lastIndexOf(".")) || Infinity) + 1);

// Helper for security consistency - restricted to .txt and .md
const isSafeExt = (path: string) => path.endsWith(".txt") || path.endsWith(".md");

const Base = z.object({
  schema_version: z.string().regex(/^1\.\d+\.\d+$/),
  id: z.string().uuid().default(() => crypto.randomUUID()),
  reasoning: z.string().min(1),
});

export const AgentProposalSchema = z.discriminatedUnion("action", [
  Base.extend({
    action: z.literal(ActionType.THINK),
    args: z.object({}).strict()
  }),

  Base.extend({
    action: z.literal(ActionType.FINISH),
    args: z.object({ response: z.string() }).strict()
  }),

  Base.extend({
    action: z.literal(ActionType.READ_FILE),
    args: z.object({ path: z.string().startsWith("/sandbox/") }).strict()
  }),

  Base.extend({
    action: z.literal(ActionType.WRITE_FILE),
    args: z.object({
      path: z.string().startsWith("/sandbox/").refine(isSafeExt, {
        message: "WRITE_FILE is restricted to .txt and .md extensions"
      }),
      content: z.string().min(1)
    }).strict()
  }),

  Base.extend({
    action: z.literal(ActionType.DELETE_FILE),
    args: z.object({
      path: z.string().startsWith("/sandbox/").refine(isSafeExt, {
        message: "DELETE_FILE is restricted to .txt and .md extensions"
      })
    }).strict()
  }),

  Base.extend({
    action: z.literal(ActionType.RENAME_FILE),
    args: z.object({
      source: z.string().startsWith("/sandbox/").refine(isSafeExt, {
        message: "RENAME_FILE source is restricted to .txt and .md"
      }),
      destination: z.string().startsWith("/sandbox/").refine(isSafeExt, {
        message: "RENAME_FILE destination is restricted to .txt and .md"
      })
    }).strict()
  }),

  Base.extend({
    action: z.literal(ActionType.CREATE_DIRECTORY),
    args: z.object({
      path: z.string().startsWith("/sandbox/")
    }).strict()
  }),

  Base.extend({
    action: z.literal(ActionType.LIST_FILES),
    args: z.object({
      path: z.string().startsWith("/sandbox/")
    }).strict()
  }),

]);

export type AgentProposal = z.infer<typeof AgentProposalSchema>;