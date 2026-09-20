import { Analyzer } from "@/components/Analyzer";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Page() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand">
            <a className="brand-mark" href="/">
              perm<span className="brand-caret">fuzz</span>
            </a>
            <span className="brand-sub">Agent permission analysis</span>
          </div>
          <div className="topbar-actions">
            <a className="btn btn-quiet" href="https://github.com/darshanahirrao/permfuzz">
              Source
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <div className="wrap">
          <section className="intro">
            <h1>See what your agent can actually touch.</h1>
            <p>
              A tool list tells you what an agent is allowed to do, not what that adds up to. Paste a
              manifest and permfuzz maps every capability it holds, then runs the rules that catch
              the combinations people miss: private data plus untrusted input plus a way out,
              unbounded shell, wildcards, and spend with no ceiling.
            </p>
            <p>
              It reads declarations and never executes anything. Nothing you paste leaves this
              browser tab.
            </p>
            <div className="intro-meta">
              <span>12 capability classes</span>
              <span>10 risk rules</span>
              <span>Every finding cites its evidence</span>
            </div>
          </section>

          <Analyzer />
        </div>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>
            Built by{" "}
            <a href="https://darsh.top" rel="me">
              Darshan Ahirrao
            </a>
            . Static analysis is a starting point, not a clean bill of health.
          </span>
          <span className="footer-links">
            <a href="https://github.com/darshanahirrao/permfuzz">Source</a>
            <a href="https://darsh.top/labs">More tools</a>
            <a href="mailto:darshan@growthforgeai.com">Contact</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
