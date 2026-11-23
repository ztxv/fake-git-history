import { buildPlan, normalizePlan } from "./planner-core.js";

export function randomSeed() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function createPlan(input = {}) {
  const options = normalizePlan(input, randomSeed);
  if (!globalThis.crypto?.subtle) {
    throw new Error("Open the demo over HTTPS or on localhost to use the planner.");
  }
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(options.seed));
  return buildPlan(options, new DataView(hash).getUint32(0, true));
}
