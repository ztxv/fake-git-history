import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  GitBranch,
  CodeXml,
  SlidersHorizontal,
  Shuffle,
  ArrowUpRight,
  CalendarDays,
  Activity,
  GitCommitHorizontal,
  FolderGit2,
  Check,
  CircleAlert,
  LoaderCircle,
  X,
  Copy,
  Monitor
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import { HistoryPresetCarousel } from "./components/history-preset-carousel";
import "./style.css";
import { PublishInstructions } from "./components/publish-instructions";
const key = d => d.toISOString().slice(0, 10);
const today = new Date();
const yearAgo = new Date(today);
yearAgo.setUTCFullYear(today.getUTCFullYear() - 1);
const initial = {
  startDate: key(yearAgo),
  endDate: key(today),
  commitsPerDay: [0, 4],
  frequency: 80,
  distribution: "uniform",
  seed: "hello-history"
};
const patterns = [
  {
    id: "uniform",
    name: "Balanced",
    description: "A little activity, any day.",
    bars: [4, 7, 5, 8, 5, 6, 4]
  },
  {
    id: "workHours",
    name: "Work hours",
    description: "Weekdays, 9 to 5.",
    bars: [1, 6, 8, 9, 8, 5, 1]
  },
  {
    id: "afterWork",
    name: "After hours",
    description: "Evenings & weekends.",
    bars: [9, 4, 3, 3, 4, 6, 10]
  }
];
async function api(url, body) {
  const response = await fetch(
    url,
    body === undefined
      ? {}
      : {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
  );
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json"))
    throw new Error(
      "The local API server is unavailable. Stop this process and run npm run dev again."
    );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function Heatmap({ preview }) {
  if (!preview)
    return (
      <div className="graph-empty">Your activity preview will appear here.</div>
    );
  const offset = new Date(`${preview.startDate}T00:00:00Z`).getUTCDay();
  const cells = [...Array(offset).fill(null), ...preview.days];
  const weeks = Math.ceil(cells.length / 7);
  let lastMonthColumn = -3;
  const months = cells.flatMap((day, i) => {
    const column = Math.floor(i / 7);
    if (
      !day ||
      !(day.date.endsWith("-01") || i === offset) ||
      column - lastMonthColumn < 3
    )
      return [];
    lastMonthColumn = column;
    return [{ date: day.date, column }];
  });
  return (
    <div className="graph-scroll">
      <div className="calendar" style={{ "--weeks": weeks }}>
        <div className="month-row">
          {months.map(({ date, column }) => (
            <span key={date} style={{ gridColumn: column + 1 }}>
              {new Date(`${date}T00:00:00Z`).toLocaleDateString("en", {
                month: "short",
                timeZone: "UTC"
              })}
            </span>
          ))}
        </div>
        <div className="graph-body">
          <div className="day-labels">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="heatmap">
            {cells.map((day, i) => (
              <div
                key={day?.date || i}
                tabIndex={day ? 0 : undefined}
                aria-label={
                  day ? `${day.date}: ${day.count} commits` : undefined
                }
                title={day ? `${day.date} · ${day.count} commits` : undefined}
                className={`cell level-${day?.count ? Math.ceil((day.count / preview.peak) * 4) : 0
                  } ${day ? "" : "blank"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function App() {
  const [settings, setSettings] = useState(initial),
    [preview, setPreview] = useState(null),
    [previewing, setPreviewing] = useState(true),
    [error, setError] = useState(""),
    [config, setConfig] = useState(null),
    [identity, setIdentity] = useState({
      name: "",
      email: "",
      folder: "my-history"
    }),
    [job, setJob] = useState(null),
    [submitting, setSubmitting] = useState(false),
    [copied, setCopied] = useState(false);
  const request = useRef(0);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        document.modelContext.registerTool(
          {
            name: "read_history_preview",
            description:
              "Read the currently displayed Git history preview without generating a repository.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false
            },
            annotations: { readOnlyHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== "object" ||
                Object.keys(input).length
              )
                throw new Error("Expected an empty object.");
              const p = previewRef.current;
              return p
                ? {
                  startDate: p.startDate,
                  endDate: p.endDate,
                  total: p.total,
                  activeDays: p.activeDays,
                  peak: p.peak
                }
                : { status: "unavailable" };
            }
          },
          { signal: lifecycle.signal }
        )
      ).catch(() => { });
    } catch { }
    return () => lifecycle.abort();
  }, []);
  const busy = submitting || job?.status === "running";
  const update = (field, value) => {
    setPreviewing(true);
    setSettings(s => ({ ...s, [field]: value }));
  };
  useEffect(() => {
    api("/api/config")
      .then(setConfig)
      .catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    const id = ++request.current;
    setPreviewing(true);
    const timeout = setTimeout(() => {
      api("/api/preview", settings)
        .then(data => {
          if (id === request.current) {
            setPreview(data);
            setError("");
          }
        })
        .catch(e => {
          if (id === request.current) {
            setError(e.message);
            setPreview(null);
          }
        })
        .finally(() => {
          if (id === request.current) setPreviewing(false);
        });
    }, 220);
    return () => {
      clearTimeout(timeout);
      request.current++;
    };
  }, [settings]);
  useEffect(() => {
    if (job?.status !== "running") return;
    let stopped = false;
    const timer = setInterval(() => {
      api(`/api/jobs/${job.id}`)
        .then(data => {
          if (!stopped) {
            setJob(data);
            setError("");
          }
        })
        .catch(e => {
          if (!stopped)
            setError(`Progress unavailable: ${e.message}. Reconnecting…`);
        });
    }, 600);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [job?.id, job?.status]);
  async function generate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      setJob(
        await api("/api/generate", { previewId: preview.id, ...identity })
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }
  async function copyPath() {
    try {
      await navigator.clipboard.writeText(job.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the path below to copy it manually.");
    }
  }
  function applyPreset(preset) {
    setPreviewing(true);
    setSettings({
      startDate: key(new Date(+today - (preset.durationDays - 1) * 86400000)),
      endDate: key(today),
      commitsPerDay: preset.commitsPerDay,
      frequency: preset.frequency,
      distribution: preset.distribution,
      seed: crypto.randomUUID()
    });
  }
  return (
    <>
      <header>
        <div className="brand">
          <span className="brand-icon">
            <GitBranch size={21} />
          </span>
          <span>
            git<span className="muted">larp</span>
          </span>
          <span className="version">LOCAL</span>
        </div>
        <div className="header-right">
          <span className="local-status">
            <i /> Running on your machine
          </span>
          <a
            className="source-code-link"
            href="https://github.com/ztxv/fake-git-history"
            target="_blank"
            rel="noreferrer"
            aria-label="Project repository on GitHub"
          >
            <CodeXml size={19} />
          </a>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">FAKE GIT HISTORY / WORKSPACE</div>
            <h1>Make time look good.</h1>
            <p>Shape your activity. Preview every commit. Generate locally.</p>
          </div>
          <span className="workspace-tag">
            <Monitor size={15} /> Local workspace
          </span>
        </div>
        <section className="preset-section" aria-labelledby="preset-heading">
          <div className="preset-heading">
            <div>
              <span className="eyebrow green">QUICK START</span>
              <h2 id="preset-heading">Start with a rhythm</h2>
              <p>Pick a recipe, then make every detail yours.</p>
            </div>
          </div>
          <HistoryPresetCarousel onApply={applyPreset} />
        </section>
        <div className="workspace">
          <aside className="panel controls">
            <div className="panel-heading">
              <SlidersHorizontal size={17} />
              <h2>Configuration</h2>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setPreviewing(true);
                  setSettings(initial);
                }}
              >
                Reset
              </Button>
            </div>
            <fieldset disabled={busy}>
              <section>
                <div className="section-label">
                  <CalendarDays size={16} />
                  <h3>Date range</h3>
                </div>
                <div className="date-fields">
                  <label>
                    Start date
                    <input
                      type="date"
                      value={settings.startDate}
                      onChange={e => update("startDate", e.target.value)}
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={settings.endDate}
                      onChange={e => update("endDate", e.target.value)}
                    />
                  </label>
                </div>
                <div className="quick-dates">
                  {[90, 180, 365].map(n => (
                    <Button
                      key={n}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewing(true);
                        setSettings(s => ({
                          ...s,
                          startDate: key(new Date(+today - (n - 1) * 86400000)),
                          endDate: key(today)
                        }));
                      }}
                    >
                      {n === 365 ? "Last year" : `${n} days`}
                    </Button>
                  ))}
                </div>
              </section>
              <section>
                <div className="section-label">
                  <Activity size={16} />
                  <h3>Activity pattern</h3>
                </div>
                <div
                  className="patterns"
                  role="group"
                  aria-label="Activity pattern"
                >
                  {patterns.map(pattern => (
                    <button
                      key={pattern.id}
                      className={`pattern ${settings.distribution === pattern.id ? "selected" : ""
                        }`}
                      aria-pressed={settings.distribution === pattern.id}
                      onClick={() => update("distribution", pattern.id)}
                    >
                      <span className="mini-bars">
                        {pattern.bars.map((height, i) => (
                          <i key={i} style={{ height: height * 2 + 3 }} />
                        ))}
                      </span>
                      <span>
                        <strong>{pattern.name}</strong>
                        <small>{pattern.description}</small>
                      </span>
                      <span className="radio-dot" />
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <div className="slider-label">
                  <label id="frequency-label">Active-day probability</label>
                  <span>{settings.frequency}%</span>
                </div>
                <Slider
                  aria-label="Active-day probability"
                  value={[settings.frequency]}
                  onValueChange={([v]) => update("frequency", v)}
                  max={100}
                  step={1}
                  disabled={busy}
                />
                <div className="range-labels">
                  <span>Quiet</span>
                  <span>Every day</span>
                </div>
                <div className="slider-label second-slider">
                  <label>Commits per day</label>
                  <span>
                    {settings.commitsPerDay[0]} – {settings.commitsPerDay[1]}
                  </span>
                </div>
                <Slider
                  value={settings.commitsPerDay}
                  onValueChange={v => update("commitsPerDay", v)}
                  max={Math.max(30, settings.commitsPerDay[1])}
                  step={1}
                  disabled={busy}
                />
                <div className="date-fields number-fields">
                  <label>
                    Minimum
                    <input
                      type="number"
                      min="0"
                      max={settings.commitsPerDay[1]}
                      value={settings.commitsPerDay[0]}
                      onChange={e =>
                        update("commitsPerDay", [
                          Number(e.target.value),
                          settings.commitsPerDay[1]
                        ])
                      }
                    />
                  </label>
                  <label>
                    Maximum
                    <input
                      type="number"
                      min={settings.commitsPerDay[0]}
                      max="100"
                      value={settings.commitsPerDay[1]}
                      onChange={e =>
                        update("commitsPerDay", [
                          settings.commitsPerDay[0],
                          Number(e.target.value)
                        ])
                      }
                    />
                  </label>
                </div>
                <p className="hint">
                  Skipped days have no commits. Pattern weights stay within your
                  daily range.
                </p>
              </section>
            </fieldset>
          </aside>
          <div className="main-column">
            <section className="panel preview-panel">
              <div className="preview-heading">
                <div>
                  <span className="eyebrow green">
                    YOUR ACTIVITY, AT A GLANCE
                  </span>
                  <h2>Contribution preview</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => update("seed", crypto.randomUUID())}
                >
                  <Shuffle />
                  Reshuffle
                </Button>
              </div>
              <div className="graph-topline">
                <span>
                  <strong>{preview?.total.toLocaleString() ?? "—"}</strong>{" "}
                  commits in your timeline
                </span>
                <span className="preview-badge">
                  {previewing ? "Updating…" : "Live preview"}
                </span>
              </div>
              <div className={previewing ? "graph updating" : "graph"}>
                <Heatmap preview={preview} />
              </div>
              <div className="graph-bottom">
                <span>Dates and commit times use UTC.</span>
                <div className="legend">
                  Less{" "}
                  {[0, 1, 2, 3, 4].map(n => (
                    <i key={n} className={`level-${n}`} />
                  ))}{" "}
                  More
                </div>
              </div>
              <div className="stats">
                <div>
                  <span>
                    <GitCommitHorizontal size={15} />
                    Total commits
                  </span>
                  <strong>{preview?.total.toLocaleString() ?? "—"}</strong>
                </div>
                <div>
                  <span>
                    <Activity size={15} />
                    Active days
                  </span>
                  <strong>
                    {preview?.activeDays ?? "—"}
                    <small> / {preview?.days.length ?? "—"}</small>
                  </strong>
                </div>
                <div>
                  <span>
                    <CalendarDays size={15} />
                    Peak per day
                  </span>
                  <strong>
                    {preview?.peak ?? "—"}
                    <small> commits</small>
                  </strong>
                </div>
              </div>
            </section>
            <section className="panel output-panel">
              <div className="section-label">
                <FolderGit2 size={19} />
                <h2>Bring your history to life</h2>
                <span className="step-tag">OUTPUT</span>
              </div>
              <p className="output-intro">
                Create a new Git repository from this exact preview.
              </p>
              <form onSubmit={generate}>
                <fieldset disabled={busy}>
                  <div className="date-fields">
                    <label>
                      Author name
                      <input
                        required
                        maxLength="100"
                        placeholder="Your name"
                        value={identity.name}
                        onChange={e =>
                          setIdentity({ ...identity, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Author email
                      <input
                        required
                        type="email"
                        maxLength="254"
                        placeholder="you@example.com"
                        value={identity.email}
                        onChange={e =>
                          setIdentity({ ...identity, email: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <p className="hint">
                    Enter the name and email you want attached to these commits.
                    Use an email connected to your GitHub or GitLab account so
                    the contributions can be attributed to you.
                  </p>
                  <label className="folder-label">
                    Repository folder
                    <div className="folder-input">
                      <span>generated /</span>
                      <input
                        required
                        pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}"
                        title="Letters, numbers, hyphens, and underscores"
                        value={identity.folder}
                        onChange={e =>
                          setIdentity({ ...identity, folder: e.target.value })
                        }
                      />
                      <FolderGit2 size={16} />
                    </div>
                  </label>
                </fieldset>
                <div className="generate-row">
                  <span>
                    <i className="small-dot" /> Existing folders are always
                    preserved.
                  </span>
                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      previewing ||
                      !preview?.total ||
                      !config?.gitAvailable
                    }
                  >
                    {busy ? <LoaderCircle className="spin" /> : <GitBranch />}
                    {busy ? "Generating…" : "Generate repository"}
                    {!busy && <ArrowUpRight />}
                  </Button>
                </div>
              </form>
            </section>
            {config && !config.gitAvailable && (
              <div className="notice error" role="alert">
                <CircleAlert size={18} />
                Git was not found. Install Git, then restart the app.
              </div>
            )}
            {error && (
              <div className="notice error" role="alert">
                <CircleAlert size={18} />
                {error}
              </div>
            )}
            {job && (
              <section
                className={`panel job-panel ${job.status}`}
                aria-live="polite"
              >
                <div className="job-title">
                  <strong>
                    {job.status === "running"
                      ? "Writing your history"
                      : job.status === "complete"
                        ? "Your repository is ready"
                        : job.status === "cancelled"
                          ? "Generation cancelled"
                          : "Generation failed"}
                  </strong>
                  {job.status === "running" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        api("/api/cancel", { id: job.id }).catch(e =>
                          setError(e.message)
                        )
                      }
                    >
                      <X />
                      Cancel
                    </Button>
                  ) : job.status === "complete" ? (
                    <Check size={20} />
                  ) : (
                    <CircleAlert size={20} />
                  )}
                </div>
                <progress value={job.completed} max={job.total || 1} />
                <p>
                  {job.completed.toLocaleString()} /{" "}
                  {job.total.toLocaleString()} commits
                </p>
                {job.error && <p>{job.error}</p>}
                {job.path && (
                  <>
                    <div className="completed-path">
                      <code>{job.path}</code>
                      <Button
                        aria-label="Copy repository path"
                        variant="ghost"
                        size="icon"
                        onClick={copyPath}
                      >
                        {copied ? <Check /> : <Copy />}
                      </Button>
                    </div>
                    <PublishInstructions key={job.id} path={job.path} />
                  </>
                )}
              </section>
            )}
            <div className="local-note">
              <Monitor size={17} />
              <div>
                <strong>Made here. Stays here.</strong>
                <p>
                  Everything runs on your computer. Nothing is uploaded or
                  pushed automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
        <footer>
          <span>
            <GitBranch size={14} /> Fake Git History · Git Larp
          </span>
          <span>Preview → Generate → Make it yours</span>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
