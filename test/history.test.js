const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createPlan } = require("../src/planner");
const { generateRepository, git } = require("../src/repository");
const { createServer } = require("../src/server");
const options = {
  startDate: "2024-02-28",
  endDate: "2024-03-01",
  commitsPerDay: [2, 2],
  frequency: 100,
  seed: "test"
};
const identity = {
  name: "History Test",
  email: "history@example.com",
  folder: "test-history"
};
test("preview is reproducible, inclusive of leap day, sorted, and bounded", () => {
  const plan = createPlan(options);
  assert.deepEqual(plan, createPlan(options));
  assert.equal(plan.total, 6);
  assert.equal(plan.days.length, 3);
  assert.deepEqual(plan.dates, [...plan.dates].sort());
  assert.equal(plan.days[1].date, "2024-02-29");
  for (const distribution of ["uniform", "workHours", "afterWork"]) {
    const p = createPlan({ ...options, distribution, commitsPerDay: [1, 5] });
    assert.ok(p.days.every(d => d.count >= 1 && d.count <= 5));
  }
  assert.equal(createPlan({ ...options, frequency: 0 }).total, 0);
});
test("rejects invalid dates, ranges, frequencies, patterns and excessive plans", () => {
  for (const patch of [
    { startDate: "2024-02-30" },
    { endDate: "2023-01-01" },
    { startDate: "bad" },
    { startDate: "" },
    { frequency: 101 },
    { frequency: "80" },
    { commitsPerDay: [5, 2] },
    { commitsPerDay: [1.2, 3] },
    { distribution: "bad" },
    { startDate: "2000-01-01" },
    {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      commitsPerDay: [100, 100]
    }
  ])
    assert.throws(() => createPlan({ ...options, ...patch }));
});
test("generated Git history exactly matches preview dates and identity; existing folders survive", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "history-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const plan = createPlan(options);
  const progress = [];
  const destination = await generateRepository({
    plan,
    root,
    ...identity,
    onProgress: n => progress.push(n)
  });
  const log = (
    await git(["log", "--reverse", "--format=%aI|%cI|%an|%ae"], destination)
  ).stdout
    .trim()
    .split("\n");
  assert.equal(log.length, plan.total);
  assert.equal(progress.at(-1), plan.total);
  log.forEach((line, i) => {
    const [author, committer, name, email] = line.split("|");
    assert.equal(new Date(author).toISOString(), plan.dates[i]);
    assert.equal(new Date(committer).toISOString(), plan.dates[i]);
    assert.equal(name, identity.name);
    assert.equal(email, identity.email);
  });
  assert.equal(
    (await git(["branch", "--show-current"], destination)).stdout.trim(),
    "main"
  );
  await assert.rejects(
    generateRepository({ plan, root, ...identity }),
    /already exists/
  );
  assert.equal(
    (await git(["rev-list", "--count", "HEAD"], destination)).stdout.trim(),
    "6"
  );
  await assert.rejects(
    generateRepository({ plan, root, ...identity, folder: "../escape" }),
    /folder name/
  );
});
test("cancellation removes only the newly created partial repository", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "history-cancel-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "keep.txt"), "preserved");
  await assert.rejects(
    generateRepository({
      plan: createPlan(options),
      root,
      ...identity,
      isCancelled: () => true
    }),
    /cancelled/
  );
  await assert.rejects(fs.access(path.join(root, identity.folder)));
  assert.equal(
    await fs.readFile(path.join(root, "keep.txt"), "utf8"),
    "preserved"
  );
});
test("HTTP preview to generation flow, validation, and cross-origin protection", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "history-api-"));
  const server = createServer({ root });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, headers = {}) =>
    fetch(base + route, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body)
    });
  assert.equal(
    (await post("/api/preview", options, { Origin: "https://example.com" }))
      .status,
    403
  );
  const badHost = await new Promise((resolve, reject) => {
    const req = require("node:http").get(
      base + "/api/config",
      { headers: { Host: "evil.example" } },
      res => {
        res.resume();
        resolve(res.statusCode);
      }
    );
    req.on("error", reject);
  });
  assert.equal(badHost, 403);
  const config = await (await fetch(base + "/api/config")).json();
  assert.equal(config.name, undefined);
  assert.equal(config.email, undefined);
  assert.equal(typeof config.gitAvailable, "boolean");
  assert.equal(
    (await post("/api/preview", { ...options, startDate: "invalid" })).status,
    400
  );
  assert.equal(
    (await post("/api/generate", { ...identity, previewId: "missing" })).status,
    400
  );
  const preview = await (await post("/api/preview", options)).json();
  assert.equal(preview.total, 6);
  assert.equal(preview.dates, undefined);
  const response = await post("/api/generate", {
    ...identity,
    previewId: preview.id
  });
  assert.equal(response.status, 202);
  let job = await response.json();
  for (let i = 0; i < 150 && job.status === "running"; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    job = await (await fetch(base + "/api/jobs/" + job.id)).json();
  }
  assert.equal(job.status, "complete");
  assert.equal(job.completed, 6);
  const dates = (
    await git(["log", "--reverse", "--format=%aI"], job.path)
  ).stdout
    .trim()
    .split("\n")
    .map(d => new Date(d).toISOString());
  assert.deepEqual(dates, createPlan(options).dates);
});

test("CLI graph preserves UTC dates across host timezones", () => {
  const { execFileSync } = require("node:child_process");
  const result = execFileSync(
    process.execPath,
    [
      "src/cli.js",
      "--preview",
      "--startDate",
      "2024/02/28",
      "--endDate",
      "2024/03/01",
      "--commitsPerDay",
      "2,2",
      "--frequency",
      "100"
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: { ...process.env, TZ: "America/New_York" }
    }
  );
  assert.match(result, /2024-02-28 to 2024-03-01/);
  assert.match(result, /Total commits: 6/);
});

test("publish command preserves literal paths and arguments without running shell substitutions", async t => {
  const { publishCommand } = await import("../web/publish-command.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "publish-command-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const name = "history 'quoted' $(touch INJECTED)";
  const destination = path.join(root, name);
  await fs.mkdir(destination);
  const { execFileSync } = require("node:child_process");
  for (const visibility of ["public", "private"]) {
    // Stub gh: exercise real shell parsing without network access or publishing.
    const output = execFileSync(
      "/bin/sh",
      [
        "-c",
        'gh() { printf "%s\\n" "$PWD" "$@"; }; ' +
          publishCommand(destination, visibility)
      ],
      { cwd: root, encoding: "utf8" }
    );
    const [cwd, ...args] = output.trim().split("\n");
    assert.equal(await fs.realpath(cwd), await fs.realpath(destination));
    assert.deepEqual(args, [
      "repo",
      "create",
      name,
      "--" + visibility,
      "--source=.",
      "--remote=origin",
      "--push"
    ]);
  }
  await assert.rejects(fs.access(path.join(root, "INJECTED")));
  assert.throws(() => publishCommand(destination, "invalid"));
});
