# Git Larp browser demo

This static site runs the same UTC history planner as the local app and CLI. It starts with fixed sample dates and a fixed seed. You can change the inputs, reshuffle the seed and inspect the timestamps for any day. The local app handles repository creation.

## Preview locally

From the repository root, serve the folder with Python 3, then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

```sh
python -m http.server 8080 --bind 127.0.0.1 --directory demo-site
```

Use `python3` if that is how Python is installed. The browser needs HTTPS or localhost for Web Crypto and must load the files over HTTP(S).

## Keep the planner in sync

Edit `src/planner-core.mjs` first. Copy it into the demo after each change. The engine test checks the copy byte for byte and verifies that Node Crypto and Web Crypto produce identical plans.

```sh
cp src/planner-core.mjs demo-site/engine/planner-core.js
node --test test/demo-engine.test.js
```

On PowerShell, use `Copy-Item src/planner-core.mjs demo-site/engine/planner-core.js`.

## Deploy

Drop this folder or a ZIP with `index.html` at its root onto [Vercel Drop](https://vercel.com/drop). Select a team, name the project, and deploy.

For a Git import, choose `demo-site` as the root directory and **Other** as the framework preset. Enable the Build Command override and leave it empty. Use `.` as the output directory if asked. The browser demo uses no install command or environment variables.
