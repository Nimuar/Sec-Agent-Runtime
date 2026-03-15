import { runRuntime } from "./stepRuntime.js";

const proposals = [
  JSON.stringify({
    schema_version: "1.0.0",
    id: crypto.randomUUID(),
    reasoning: "Need to read config",
    action: "READ_FILE",
    args: { path: "/sandbox/test.txt" }
  }),

  JSON.stringify({
    schema_version: "1.0.0",
    id: crypto.randomUUID(),
    reasoning: "Task complete",
    action: "FINISH",
    args: { response: "Done" }
  })
];

let i = 0;

async function fetchNextProposal(): Promise<string | null> {
  if (i >= proposals.length) return null;
  return proposals[i++];
}

async function main() {
  const results = await runRuntime(fetchNextProposal);

  console.log("Runtime results:");
  console.log(JSON.stringify(results, null, 2));
}

main();