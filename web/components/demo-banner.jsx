import { ArrowUpRight } from "lucide-react";
import css from "./demo-banner.css?raw";

const DEMO_REPO_URL = "https://github.com/ztxv/fake-git-history";

// Shown only in the hosted demo build. Keeps the "nothing here is real" promise
// in view without getting in the way of the studio itself. Its styles ride along
// as a plain string so the normal build drops them with the component.
export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <style>{css}</style>
      <span className="demo-banner-label">
        <i aria-hidden="true" />
        LIVE DEMO
      </span>
      <span className="demo-banner-text">
        Nothing is saved or created here.
      </span>
      <a href={DEMO_REPO_URL} target="_blank" rel="noopener noreferrer">
        Run it locally for real <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </div>
  );
}
