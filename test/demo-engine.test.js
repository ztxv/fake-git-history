const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { test } = require("node:test");
const { createPlan } = require("../src/planner");

test("the demo's planner core matches the source byte for byte", async () => {
  const [source, demo] = await Promise.all([
    fs.readFile(path.join(__dirname, "../src/planner-core.mjs")),
    fs.readFile(path.join(__dirname, "../demo-site/engine/planner-core.js"))
  ]);
  assert.ok(source.equals(demo), "Re-sync planner-core.mjs using demo-site/README.md.");
});

test("Web Crypto and Node generate identical plans from the same inputs", async () => {
  const { createPlan: createBrowserPlan } = await import("../demo-site/engine/planner.js");
  const options = {
    startDate: "2024-02-26",
    endDate: "2024-03-10",
    frequency: 82,
    commitsPerDay: [1, 12],
    seed: "leap-day 🌱"
  };

  for (const distribution of ["uniform", "workHours", "afterWork"]) {
    const input = { ...options, distribution };
    assert.deepEqual(await createBrowserPlan(input), createPlan(input));
  }
  await assert.rejects(createBrowserPlan({ ...options, commitsPerDay: [6, 2] }), /ordered range/);
  const generated = await createBrowserPlan({ ...options, seed: undefined });
  assert.match(generated.seed, /^[0-9a-f]{8}$/);
});
