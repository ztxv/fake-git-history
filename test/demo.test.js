const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createPlan } = require("../src/planner");
const repository = require("../src/repository");

const options = {
  startDate: "2024-02-26",
  endDate: "2024-03-10",
  frequency: 82,
  commitsPerDay: [1, 12],
  seed: "leap-day 🌱"
};
const load = () => import("../web/demo.mjs");

test("the hosted demo plans exactly like the local server", async () => {
  const { demoApi, createPlan: createBrowserPlan } = await load();
  for (const distribution of ["uniform", "workHours", "afterWork"]) {
    const input = { ...options, distribution };
    const { dates, ...expected } = createPlan(input);
    assert.deepEqual(await createBrowserPlan(input), createPlan(input));
    const { id, ...preview } = await demoApi("/api/preview", input);
    assert.ok(id);
    assert.deepEqual(preview, expected);
  }
  await assert.rejects(
    demoApi("/api/preview", { ...options, commitsPerDay: [6, 2] }),
    /ordered range/
  );
  const generated = await createBrowserPlan({ ...options, seed: undefined });
  assert.match(generated.seed, /^[0-9a-f]{8}$/);
});

test("the demo's identity and folder checks agree with the real ones", async () => {
  const demo = await load();
  const real = (name, email) => {
    try {
      repository.validateIdentity(name, email);
      return null;
    } catch (error) {
      return error.message;
    }
  };
  const fake = (name, email) => {
    try {
      demo.validateIdentity(name, email);
      return null;
    } catch (error) {
      return error.message;
    }
  };
  for (const [name, email] of [
    ["Ada", "ada@example.com"],
    ["", "ada@example.com"],
    ["  ", "ada@example.com"],
    ["A".repeat(101), "ada@example.com"],
    ["Ada <x>", "ada@example.com"],
    ["Ada\nB", "ada@example.com"],
    ["Ada", "nope"],
    ["Ada", "a@b"],
    ["Ada", `${"a".repeat(250)}@x.io`],
    ["Ada", "a b@example.com"],
    [undefined, "ada@example.com"],
    ["Ada", undefined]
  ])
    assert.equal(fake(name, email), real(name, email), JSON.stringify([name, email]));
  for (const folder of ["my-history", "a", "_x", "-x", "a b", "a/b", "", "x".repeat(81)])
    assert.equal(
      demo.validFolder(folder),
      /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(folder)
    );
});

test("the demo's generate, progress and cancel flow mirrors the server's job shape", async t => {
  const { demoApi } = await load();
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const identity = { name: "Ada", email: "ada@example.com", folder: "demo-run" };
  const { id: previewId } = await demoApi("/api/preview", options);

  assert.deepEqual(await demoApi("/api/config"), {
    gitAvailable: true,
    outputRoot: "/path/to/fake-git-history/generated"
  });
  const job = await demoApi("/api/generate", { previewId, ...identity });
  assert.equal(job.status, "running");
  assert.equal(job.completed, 0);
  assert.ok(job.total > 0);
  await assert.rejects(
    demoApi("/api/generate", { previewId, ...identity }),
    /already running/
  );

  now += 1000;
  const mid = await demoApi(`/api/jobs/${job.id}`);
  assert.equal(mid.status, "running");
  assert.ok(mid.completed > 0 && mid.completed < mid.total);
  now += 10000;
  const done = await demoApi(`/api/jobs/${job.id}`);
  assert.equal(done.status, "complete");
  assert.equal(done.completed, done.total);
  assert.match(done.path, /generated\/demo-run$/);

  const second = await demoApi("/api/generate", { previewId, ...identity });
  await demoApi("/api/cancel", { id: second.id });
  const cancelled = await demoApi(`/api/jobs/${second.id}`);
  assert.equal(cancelled.status, "cancelled");
  assert.match(cancelled.error, /cancelled/i);
  assert.equal(cancelled.path, undefined);

  const bad = await demoApi("/api/generate", { previewId, ...identity, folder: "no good" });
  now += 1000;
  assert.equal((await demoApi(`/api/jobs/${bad.id}`)).status, "failed");
  await assert.rejects(
    demoApi("/api/generate", { previewId: "missing", ...identity }),
    /Preview expired/
  );
  await assert.rejects(demoApi("/api/jobs/missing"), /Job not found/);
});
