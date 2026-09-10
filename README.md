# History Studio

**Design Git activity visually. Generate a real repository locally.**

History Studio is a local web interface for Fake Git History. Configure dates, activity patterns, and commit counts, inspect the contribution heatmap, then generate a repository from that exact preview. A terminal CLI is included for scripted use.

The app runs on your computer. No account, database, or API keys are needed to preview or generate history. Publishing is an optional step you run in your own terminal.

[Quick start](#quick-start) · [Usage](#usage) · [Publishing](#publishing) · [Development](#development) · [Contributing](#contributing) · [License](#license)

<!-- Add your screenshots here once ready. Use repository-relative image paths. -->

## Features

- **Live contribution preview** with total commits, active days, and peak daily activity.
- **Date controls** with custom ranges and 90-day, 180-day, and last-year presets.
- **Three activity patterns** with adjustable probability and daily commit ranges.
- **Reshuffle** to explore another arrangement without changing your settings.
- **Compact, responsive interface** with shadcn-style buttons, Radix sliders, and fixed-size calendar cells. Long timelines scroll horizontally.
- **Local repository generation** with progress, cancellation, and protection against overwriting existing folders.
- **Publishing instructions** with your exact local path, public/private selection, and a copyable GitHub CLI command.
- **Shared generation engine** for the browser interface and CLI.

## Quick start

### Requirements

- **Node.js 22.12.0 or newer**, with npm.
- **Git** available in your terminal. The generator uses `git init -b main`; use a Git version that supports it.
- A modern desktop browser and a writable project directory.

Check your installation:

```sh
node --version
npm --version
git --version
```

### Install and launch

Clone this repository, or choose **Code → Download ZIP** on GitHub and extract it. Open a terminal in the directory containing `package.json`, then run:

```sh
npm ci
npm start
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in your browser.

`npm ci` installs the versions recorded in the lockfile. `npm start` builds the frontend and starts the local server. Keep that terminal running while using the app; press **Ctrl+C** to stop it. On subsequent launches, run `npm start` again.

Dependency installation requires internet access. Previewing and generating repositories work offline afterward; publishing requires a connection to your Git host.

### Use another port

The default port is `3000`. To change it:

**macOS / Linux / Git Bash**

```sh
PORT=3001 npm start
```

**Windows PowerShell**

```powershell
$env:PORT = "3001"
npm start
```

Then visit `http://127.0.0.1:3001`. The server binds to the loopback interface, so it is accessible only from the computer running it.

## Usage

1. **Choose your dates.** Set an inclusive start/end range or select a preset.
2. **Select a pattern.** Choose Balanced, Work hours, or After hours.
3. **Adjust activity.** Set the active-day probability and minimum/maximum commits per day. Use the number inputs for precise values up to 100.
4. **Review the preview.** Inspect the heatmap and statistics. Hover over a cell for its date and count; cells also have keyboard focus and accessible labels. Use **Reshuffle** for another arrangement.
5. **Set the author and folder.** The app reads your Git name and email when available; both are editable. Choose a new repository folder name.
6. **Generate.** Click **Generate repository**, then follow progress or cancel. The completion screen shows the local path and publishing instructions.

### Activity patterns

| Interface label | CLI value   | Behavior                                                                                                  |
| --------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| Balanced        | `uniform`   | Uniform random daily counts within your range, with commit times weighted toward daytime hours.           |
| Work hours      | `workHours` | Higher daily activity on weekdays, especially Tuesday–Thursday, with times weighted toward working hours. |
| After hours     | `afterWork` | Higher daily activity on weekends, with times weighted toward evenings.                                   |

Patterns are weighted distributions, not strict schedules. All dates and times use **UTC**.

**Probability and daily counts are separate controls.** At 80%, each day has an 80% chance of being selected for activity. A selected day can still have zero commits if your minimum is zero. Days skipped by probability always have zero commits, even with a positive minimum.

### What gets created

The web app writes to `generated/<folder>` inside this project. For example:

```text
history-studio/
└── generated/
    └── my-history/
        └── .git/
```

Each result is an independent Git repository with:

- A `main` branch.
- Empty commits with the message `Generated history`.
- Author and committer identity set from your inputs.
- Both author and committer timestamps set to the stored preview dates, in chronological order.

An empty working directory is expected: the generated history lives in `.git`. The generator does not add sample files or copy this application's source into the result. Generated repositories are ignored by this project's `.gitignore`.

Existing destination folders are rejected, never replaced. A handled failure or cancellation attempts to remove the newly created partial repository. An abrupt shutdown can leave a partial folder behind; inspect it and choose a new folder name before retrying.

## Publishing

### Create a new GitHub repository

After generation, choose **Public** or **Private** in the completion panel and click **Copy command**. Public is the default. The command includes the actual path and uses the local folder name as the GitHub repository name:

```sh
cd '/path/to/history-studio/generated/my-history' && gh repo create 'my-history' --public --source=. --remote=origin --push
```

Install [GitHub CLI](https://cli.github.com/) and authenticate in your terminal once:

```sh
gh auth login
```

Then paste the copied command into **Bash, Zsh, or Git Bash**. It creates the remote repository, adds `origin`, and pushes the local history. Choose a name that does not already exist on your account; do not create the remote beforehand. Selecting Private changes the command to `--private`.

The generated command uses POSIX shell quoting; it is not a PowerShell or Command Prompt command. GitHub authentication and publishing happen in your terminal—the website does not store GitHub credentials or run the command. See the [GitHub CLI reference](https://cli.github.com/manual/gh_repo_create) for command details.

### Use an existing remote or another Git host

Create an empty repository on your Git host, open a terminal in the generated local repository, and run the following commands. Replace `YOUR_REMOTE_URL` with its SSH or HTTPS URL:

```sh
git remote add origin YOUR_REMOTE_URL
git push -u origin main
```

The preview represents commits in the generated repository. It does not fetch or combine your existing account activity. Contribution visibility on GitHub or GitLab depends on the host's rules, including account email, branch, and repository visibility; the local heatmap is not a guarantee of how your profile will appear.

## CLI

From this project's root, preview activity without writing a repository:

```sh
npm run cli -- --preview
```

Preview a custom range and pattern:

```sh
npm run cli -- --preview --startDate 2024/01/01 --endDate 2024/12/31 --frequency 70 --commitsPerDay "0,6" --distribution workHours
```

Remove `--preview` to generate a repository. CLI generation reads `user.name` and `user.email` from your Git configuration and writes to `my-history` in the current working directory, rather than `generated/`.

| Option            | Alias | Default      | Description                                                 |
| ----------------- | ----- | ------------ | ----------------------------------------------------------- |
| `--preview`       | `-p`  | `false`      | Render a terminal graph without creating a repository.      |
| `--startDate`     | `-s`  | One year ago | First day, inclusive; `YYYY/MM/DD` or `YYYY-MM-DD`.         |
| `--endDate`       | `-e`  | Today        | Last day, inclusive; same formats as the start date.        |
| `--commitsPerDay` | `-c`  | `0,4`        | Ordered minimum and maximum, each an integer from 0 to 100. |
| `--frequency`     | `-f`  | `80`         | Probability of selecting a day, from 0 to 100.              |
| `--distribution`  | `-d`  | `uniform`    | `uniform`, `workHours`, or `afterWork`.                     |

Separate CLI invocations generate new random plans, so a CLI preview and a later generation can differ. The web interface retains its preview and generates those exact timestamps.

## Limits and local state

| Setting           | Current behavior                                                                    |
| ----------------- | ----------------------------------------------------------------------------------- |
| Date range        | 1–1,830 days inclusive, approximately five years.                                   |
| Daily count       | 0–100 commits; minimum must not exceed maximum.                                     |
| Plan size         | At most 25,000 commits. A zero-commit preview cannot be generated.                  |
| Folder name       | 1–80 letters, numbers, hyphens, or underscores; must start with a letter or number. |
| Generation        | One active job per server instance.                                                 |
| Preview retention | Up to 20 previews in memory, each valid for 30 minutes.                             |
| Job retention     | Up to 20 jobs in memory; not restored after a server restart.                       |

Form values and the active job display are not persisted across page reloads. Closing or refreshing the browser does not cancel a running generation while the server remains running, but the refreshed page does not reconnect to that job. Use **Cancel** before leaving if you want generation to stop.

The server serves the built frontend and a local JSON API. It checks Host/Origin headers and requires JSON for API writes. There is no user authentication or multi-user isolation; the app is intended for local use, not public hosting.

## Development

The frontend uses **React, Vite, Tailwind CSS, Radix primitives, and Lucide icons**. The backend uses **Node.js's built-in HTTP server** and invokes the installed Git executable. Backend modules use CommonJS; frontend modules use ES modules.

After installing dependencies, run two terminals from the project root:

**Terminal 1 — API server**

```sh
npm run start:server
```

**Terminal 2 — frontend with hot reload**

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to port `3000`; keep the API server on that port for development. Port `5173` is fixed and must be available. Restart the API server after backend edits.

A frontend build is not required when using Vite. To serve the production interface directly from the API server, run `npm run build` first, or use `npm start`.

### Scripts

| Command                    | Purpose                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `npm start`                | Build the frontend, then start the local server.                                      |
| `npm run build`            | Produce the frontend bundle in `dist/`.                                               |
| `npm run start:server`     | Start the API and serve any existing `dist/` build.                                   |
| `npm run dev`              | Start the Vite development server on port 5173.                                       |
| `npm run cli -- [options]` | Run the terminal interface.                                                           |
| `npm test`                 | Run Node's built-in test suite.                                                       |
| `npm run lint`             | Run Prettier **with writes** on `src/**/*.js`; this is not a full-project lint check. |

### Project structure

```text
src/
├── cli.js                    # CLI flags and entry point
├── index.js                  # CLI orchestration
├── planner.js                # Input validation and seeded activity planning
├── repository.js             # Git execution, identity, progress, and cleanup
├── server.js                 # Local HTTP API and static frontend serving
└── visualization.js          # Terminal contribution graph
web/
├── main.jsx                  # Workspace, heatmap, form state, and job polling
├── style.css                 # Theme, layout, and responsive styles
├── publish-command.mjs       # Shell-quoted publishing command builder
└── components/
    ├── publish-instructions.jsx
    └── ui/                   # Local Button and Slider primitives
test/history.test.js         # Planner, Git, HTTP, CLI, and command tests
index.html                   # Browser entry point
vite.config.mjs              # Frontend build and development proxy
```

The planner creates a seeded list of timestamps. The API stores that plan and returns a preview ID with daily counts. Generation looks up the stored plan by ID, writes the commits, and exposes job status for the UI to poll. Git execution uses argument arrays rather than interpolated shell commands.

To extend activity patterns, start in `src/planner.js` and update the available choices in `web/main.jsx` and `src/cli.js`. For interface changes, start in `web/`. Keep shared generation behavior in the backend so the web and CLI remain consistent.

### Validation

```sh
npm test
npm run build
```

Tests cover reproducible plans, date and limit validation, actual Git timestamps and identity, existing-folder protection, cancellation cleanup, the HTTP generation flow, UTC rendering in the CLI, and shell quoting in publishing commands. They create temporary repositories and a temporary loopback server; they do not publish to GitHub.

The full suite currently requires `/bin/sh`, and one test uses filenames that are not valid on native Windows. Run it on macOS, Linux, or inside WSL. Automated browser interaction and visual regression tests are not included.

## Troubleshooting

| Problem                                 | What to check                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `node`, `npm`, or `git` is not found    | Install the missing tool, confirm it is on your PATH, then reopen the terminal.                 |
| The port is busy                        | Stop the process using it or choose another production port with `PORT`.                        |
| The page reports missing frontend files | Run `npm start`, or run `npm run build` before `npm run start:server`.                          |
| Frontend changes are not visible        | Use Vite during development, or rebuild and refresh the production page.                        |
| Vite loads but API requests fail        | Confirm the backend is running on port 3000 and that `PORT` is not set to another value.        |
| The destination folder already exists   | Choose a different folder name; existing folders are preserved.                                 |
| The preview expired                     | Reshuffle or change a setting to request a fresh preview, then review it before generating.     |
| Generate is disabled                    | Wait for the preview, check that Git is available, and ensure the plan has at least one commit. |
| CLI generation cannot read an identity  | Configure Git's `user.name` and `user.email`, or enter them directly in the web app.            |
| Copying fails                           | Select the displayed path or command and copy it manually.                                      |

## Contributing

Forks, fixes, and new ideas are welcome. Open an issue to describe a bug or propose a feature; for larger changes, explain the intended behavior before starting implementation.

To contribute:

1. Fork this repository and create a branch for your change.
2. Follow the development setup above.
3. Keep changes focused and add regression coverage for behavior changes.
4. Run the test suite and production build. For UI changes, also check short and long date ranges, narrow screens, and keyboard controls.
5. Open a pull request describing the problem, the change, and how you verified it. Include screenshots for visual changes.

Commit lockfile changes when adding dependencies. Keep generated repositories, build output, and credentials out of pull requests. Preserve the local workflow and make any publishing action explicit.

## Credits

Built on [artiebits/fake-git-history](https://github.com/artiebits/fake-git-history), originally created by Artur Khusaenov. The web interface uses local shadcn-style components composed from Radix primitives and Tailwind CSS.

## License

[MIT](LICENSE). You can use, modify, and redistribute the project, including for commercial use, under the terms in `LICENSE`. Retain the copyright and license notice when distributing copies or substantial portions of the software.
