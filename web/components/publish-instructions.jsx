import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Button } from "./ui/button";
import { publishCommand } from "../publish-command.mjs";
export function PublishInstructions({ path }) {
  const [visibility, setVisibility] = useState("public");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const command = publishCommand(path, visibility);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setError("");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Select the command below to copy it manually.");
    }
  }
  return (
    <div className="publish-instructions">
      <div className="publish-heading">
        <h3>Push to GitHub</h3>
        <label className="visibility-label">
          Visibility
          <select
            value={visibility}
            onChange={e => {
              setVisibility(e.target.value);
              setCopied(false);
            }}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
      </div>
      <p>
        Create a new {visibility} GitHub repository and push this history with
        one command.
      </p>
      <div className="command-block">
        <div className="command-toolbar">
          <span>
            <Terminal size={14} /> Bash / Zsh / Git Bash
          </span>
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied!" : "Copy command"}
          </Button>
        </div>
        <pre>
          <code>{command}</code>
        </pre>
      </div>
      <p className="publish-help">
        Run in your terminal with{" "}
        <a href="https://cli.github.com/" target="_blank" rel="noreferrer">
          GitHub CLI
        </a>{" "}
        installed. First time? Run <code>gh auth login</code> there, then paste
        the command above. It creates the remote for you; use a repository name
        that isn’t already on your account.
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
