const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { createPlan } = require("./planner");
const { git, validateIdentity, generateRepository } = require("./repository");
function createServer({ root = path.resolve(__dirname, "../generated") } = {}) {
  const plans = new Map(),
    jobs = new Map();
  let active;
  const server = http.createServer(async (req, res) => {
    const send = (code, data) => {
      res.writeHead(code, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      });
      res.end(JSON.stringify(data));
    };
    const expected = `127.0.0.1:${server.address().port}`;
    if (
      ![expected, `localhost:${server.address().port}`].includes(
        req.headers.host
      ) ||
      (req.headers.origin &&
        ![
          `http://${expected}`,
          `http://localhost:${server.address().port}`
        ].includes(req.headers.origin))
    )
      return send(403, {
        error: "Only local, same-origin requests are allowed."
      });
    try {
      const url = new URL(req.url, `http://${expected}`);
      if (req.method === "GET" && url.pathname === "/api/config") {
        let available = true;
        try {
          await git(["--version"]);
        } catch {
          available = false;
        }
        return send(200, {
          gitAvailable: available,
          outputRoot: root
        });
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
        const job = jobs.get(url.pathname.split("/").pop());
        return send(job ? 200 : 404, job || { error: "Job not found." });
      }
      if (req.method === "POST" && url.pathname.startsWith("/api/")) {
        if (!req.headers["content-type"]?.startsWith("application/json"))
          return send(415, { error: "Expected JSON." });
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 16384)
            return send(413, { error: "Request too large." });
        }
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          return send(400, { error: "Invalid JSON." });
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          return send(400, { error: "Expected an object." });
        if (url.pathname === "/api/preview") {
          const plan = createPlan(body),
            id = crypto.randomUUID();
          for (const [key, value] of plans)
            if (Date.now() - value.created > 1800000) plans.delete(key);
          if (plans.size >= 20) plans.delete(plans.keys().next().value);
          plans.set(id, { plan, created: Date.now() });
          const { dates, ...preview } = plan;
          return send(200, { ...preview, id });
        }
        if (url.pathname === "/api/generate") {
          if (active)
            return send(409, { error: "A generation is already running." });
          const saved = plans.get(body.previewId);
          if (!saved || Date.now() - saved.created > 1800000)
            return send(400, {
              error: "Preview expired. Refresh it before generating."
            });
          validateIdentity(body.name, body.email);
          const job = {
            id: crypto.randomUUID(),
            status: "running",
            completed: 0,
            total: saved.plan.total,
            cancelled: false
          };
          jobs.set(job.id, job);
          active = job;
          if (jobs.size > 20) jobs.delete(jobs.keys().next().value);
          generateRepository({
            plan: saved.plan,
            root,
            folder: body.folder,
            name: body.name,
            email: body.email,
            onProgress: n => (job.completed = n),
            isCancelled: () => job.cancelled
          })
            .then(destination => {
              job.status = "complete";
              job.path = destination;
            })
            .catch(error => {
              job.status = error.cancelled ? "cancelled" : "failed";
              job.error = error.message;
            })
            .finally(() => (active = null));
          return send(202, job);
        }
        if (url.pathname === "/api/cancel") {
          if (active && active.id === body.id) active.cancelled = true;
          return send(200, { ok: true });
        }
        return send(404, { error: "Unknown API endpoint." });
      }
      if (req.method !== "GET" || url.pathname.startsWith("/api/"))
        return send(404, { error: "Not found." });
      const relative =
        url.pathname === "/"
          ? "index.html"
          : decodeURIComponent(url.pathname).slice(1);
      const dist = path.resolve(__dirname, "../dist");
      const file = path.resolve(dist, relative);
      if (!file.startsWith(dist + path.sep))
        return send(403, { error: "Forbidden." });
      let data;
      try {
        data = await fs.readFile(file);
      } catch {
        return send(404, { error: "File not found. Run npm run build first." });
      }
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml"
          }[path.extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; script-src 'self'; frame-ancestors 'none'"
      });
      res.end(data);
    } catch (error) {
      send(400, { error: error.message });
    }
  });
  return server;
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.on("error", error => {
    console.error(
      error.code === "EADDRINUSE"
        ? `Port ${port} is busy. Try PORT=3001 npm start.`
        : error.message
    );
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `\n  History Studio → http://127.0.0.1:${
        server.address().port
      }\n  Press Ctrl+C to stop.\n`
    )
  );
}
module.exports = { createServer };
