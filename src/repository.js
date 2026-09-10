const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs/promises");
const path = require("node:path");
const exec = promisify(execFile);
const git = (args, cwd, env = {}) =>
  exec("git", args, { cwd, env: { ...process.env, ...env }, timeout: 30000 });
function validateIdentity(name, email) {
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
async function generateRepository({
  plan,
  root,
  folder,
  name,
  email,
  onProgress = () => {},
  isCancelled = () => false
}) {
  validateIdentity(name, email);
  if (
    typeof folder !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(folder)
  )
    throw new Error(
      "Use a folder name of 1–80 letters, numbers, hyphens, or underscores."
    );
  if (!plan.total)
    throw new Error(
      "Your preview has no commits. Increase activity before generating."
    );
  await git(["--version"]);
  await fs.mkdir(root, { recursive: true });
  const destination = path.join(root, folder);
  try {
    await fs.mkdir(destination);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error("That folder already exists. Choose a different name.");
    throw error;
  }
  try {
    await git(["init", "-b", "main"], destination);
    const env = {
      GIT_AUTHOR_NAME: name.trim(),
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name.trim(),
      GIT_COMMITTER_EMAIL: email
    };
    for (let i = 0; i < plan.dates.length; i++) {
      if (isCancelled()) {
        const error = new Error(
          "Generation cancelled. The partial repository was removed."
        );
        error.cancelled = true;
        throw error;
      }
      const date = plan.dates[i];
      await git(
        [
          "-c",
          "commit.gpgSign=false",
          "-c",
          "core.hooksPath=",
          "commit",
          "--allow-empty",
          "--quiet",
          "-m",
          "Generated history"
        ],
        destination,
        { ...env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
      );
      onProgress(i + 1);
    }
    return destination;
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  }
}
module.exports = { git, validateIdentity, generateRepository };
