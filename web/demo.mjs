// Demo mode: a browser-only stand-in for the local Git Larp server.
//
// The real app needs a Node server to run Git and write repositories to disk,
// which a static host (like Vercel) can't do. In demo mode the UI is the same
// app, but every /api call is answered here and nothing is ever written
// anywhere. Enabled with `npm run build:demo` (VITE_DEMO=true).
//
// Planning uses the real planner (src/planner-core.mjs), so previews match what
// the local app and CLI would produce for the same settings.
import { buildPlan, normalizePlan } from "../src/planner-core.mjs";

export const DEMO_OUTPUT_ROOT = "/path/to/fake-git-history/generated";
const PREVIEW_TTL = 1800000;
const MAX_PREVIEWS = 20;
const MAX_JOBS = 20;

const plans = new Map();
const jobs = new Map();
let active = null;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const id = () => crypto.randomUUID();
const randomSeed = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(4)), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");

// Browser twin of src/planner.js: same SHA-256 seed, same planner core.
export async function createPlan(input = {}) {
  const options = normalizePlan(input, randomSeed);
  if (!globalThis.crypto?.subtle)
    throw new Error("Open the demo over HTTPS or on localhost to use the planner.");
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(options.seed)
  );
  return buildPlan(options, new DataView(hash).getUint32(0, true));
}

// These mirror validateIdentity() and the folder rule in src/repository.js,
// which can't be imported here because that module needs Node and Git.
// test/demo.test.js keeps them in step with the originals.
export function validateIdentity(name, email) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 100 ||
    /[\r\n<>\x00]/.test(name)
  )
    throw new Error("Enter a valid author name.");
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ||
    email.includes("\0")
  )
    throw new Error("Enter a valid author email.");
}
export const validFolder = folder =>
  typeof folder === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(folder);

// Progress is derived from elapsed time, so polling stays stateless and cheap.
function snapshot(job) {
  if (job.status === "running") {
    const elapsed = Date.now() - job.startedAt;
    if (elapsed >= job.duration) {
      if (job.failure) {
        job.status = "failed";
        job.error = job.failure;
      } else {
        job.status = "complete";
        job.completed = job.total;
        job.path = `${DEMO_OUTPUT_ROOT}/${job.folder}`;
      }
    } else if (!job.failure) {
      // Ease-out so the bar feels like real, front-loaded work.
      const t = elapsed / job.duration;
      job.completed = Math.floor(job.total * (1 - (1 - t) * (1 - t)));
    }
  }
  if (job.status !== "running" && active === job) active = null;
  const { startedAt, duration, folder, failure, ...fields } = job;
  return { ...fields };
}

export async function demoApi(route, body) {
  await wait(60);
  if (route === "/api/config")
    return { gitAvailable: true, outputRoot: DEMO_OUTPUT_ROOT };

  if (route === "/api/preview") {
    const plan = await createPlan(body);
    const previewId = id();
    for (const [key, value] of plans)
      if (Date.now() - value.created > PREVIEW_TTL) plans.delete(key);
    if (plans.size >= MAX_PREVIEWS) plans.delete(plans.keys().next().value);
    plans.set(previewId, { total: plan.total, created: Date.now() });
    const { dates, ...preview } = plan;
    return { ...preview, id: previewId };
  }

  if (route === "/api/generate") {
    if (active) snapshot(active);
    if (active) throw new Error("A generation is already running.");
    const saved = plans.get(body.previewId);
    if (!saved || Date.now() - saved.created > PREVIEW_TTL)
      throw new Error("Preview expired. Refresh it before generating.");
    validateIdentity(body.name, body.email);
    const failure = !validFolder(body.folder)
      ? "Use a folder name of 1–80 letters, numbers, hyphens, or underscores."
      : !saved.total
        ? "Your preview has no commits. Increase activity before generating."
        : null;
    const job = {
      id: id(),
      status: "running",
      completed: 0,
      total: saved.total,
      cancelled: false,
      folder: body.folder,
      failure,
      startedAt: Date.now(),
      duration: failure ? 150 : Math.min(6000, Math.max(2500, saved.total * 4))
    };
    jobs.set(job.id, job);
    active = job;
    if (jobs.size > MAX_JOBS) jobs.delete(jobs.keys().next().value);
    return snapshot(job);
  }

  if (route.startsWith("/api/jobs/")) {
    const job = jobs.get(route.split("/").pop());
    if (!job) throw new Error("Job not found.");
    return snapshot(job);
  }

  if (route === "/api/cancel") {
    const job = active && active.id === body.id ? active : null;
    if (job && snapshot(job).status === "running") {
      job.cancelled = true;
      job.status = "cancelled";
      job.error = "Generation cancelled. Nothing was created in this demo.";
      active = null;
    }
    return { ok: true };
  }

  throw new Error("Unknown API endpoint.");
}
