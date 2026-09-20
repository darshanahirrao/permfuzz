"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyze } from "@/lib/analyze";
import { ManifestError } from "@/lib/parse";
import { DEFAULT_SAMPLE, SAMPLES } from "@/lib/samples";
import type { Report } from "@/lib/types";
import { SeverityChip } from "./SeverityChip";

interface Failure {
  message: string;
  hint: string;
}

function verdictWord(report: Report): string {
  if (report.verdict === "pass") return "No findings";
  if (report.verdict === "critical") return "Critical exposure";
  if (report.verdict === "high") return "Elevated exposure";
  return "Minor exposure";
}

function meterClass(report: Report): string {
  if (report.verdict === "critical") return "meter-fill meter-fill-risk";
  if (report.verdict === "high") return "meter-fill meter-fill-warn";
  if (report.verdict === "medium") return "meter-fill";
  return "meter-fill meter-fill-ok";
}

function buildSummary(report: Report): string {
  const lines: string[] = [];
  lines.push(`# permfuzz report: ${report.agent}`);
  lines.push("");
  lines.push(`Risk score ${report.score}/100. ${verdictWord(report)}.`);
  lines.push(
    `Findings: ${report.counts.critical} critical, ${report.counts.high} high, ${report.counts.medium} medium.`,
  );
  lines.push(`${report.tools.length} tools scanned across ${new Set(report.tools.map((tool) => tool.server)).size} servers.`);
  lines.push("");
  report.findings.forEach((finding, index) => {
    lines.push(`## ${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`);
    lines.push("");
    lines.push(finding.why);
    lines.push("");
    lines.push(`Repair: ${finding.repair}`);
    if (finding.evidence.length > 0) {
      lines.push("");
      lines.push("Evidence:");
      for (const item of finding.evidence) {
        lines.push(`- ${item.tool}: ${item.detail}`);
      }
    }
    lines.push("");
  });
  return lines.join("\n");
}

export function Analyzer() {
  const [text, setText] = useState(DEFAULT_SAMPLE.manifest);
  const [report, setReport] = useState<Report | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSample, setActiveSample] = useState<string | null>(DEFAULT_SAMPLE.id);
  const analyzedText = useRef<string | null>(null);

  const run = useCallback(async (input: string) => {
    setBusy(true);
    setFailure(null);
    // Yield one frame so the busy state paints before the synchronous scan.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      setReport(analyze(input));
      analyzedText.current = input;
    } catch (error) {
      if (error instanceof ManifestError) {
        setFailure({ message: error.message, hint: error.hint });
      } else {
        setFailure({
          message: "The scan failed unexpectedly.",
          hint: "Reload the page and try again. If it repeats, please report the manifest.",
        });
      }
      setReport(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run(DEFAULT_SAMPLE.manifest);
  }, [run]);

  const dirty = report !== null && analyzedText.current !== null && text !== analyzedText.current;
  const summary = useMemo(() => (report ? buildSummary(report) : ""), [report]);
  const serverCount = report ? new Set(report.tools.map((tool) => tool.server)).size : 0;

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function loadSample(id: string) {
    const sample = SAMPLES.find((entry) => entry.id === id);
    if (!sample) return;
    setActiveSample(sample.id);
    setText(sample.manifest);
    void run(sample.manifest);
  }

  const note = activeSample
    ? SAMPLES.find((entry) => entry.id === activeSample)?.note
    : undefined;

  return (
    <div className="workspace">
      <div className="rail">
        <section className="panel" aria-labelledby="input-heading">
          <div className="panel-head">
            <h2 id="input-heading" className="label">
              Tool manifest
            </h2>
          </div>
          <div className="panel-body stack">
            <div className="rail-head">
              <span className="field-label" id="samples-label">
                Load a sample
              </span>
              <div className="samples" role="group" aria-labelledby="samples-label">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className="sample-chip"
                    aria-pressed={activeSample === sample.id}
                    onClick={() => loadSample(sample.id)}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
              {note ? <p className="sample-note">{note}</p> : null}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="manifest">
                Paste your own
              </label>
              <p className="field-hint" id="manifest-hint">
                A JSON object with a tools array, or a servers array where each server lists its own
                tools. Scopes and approval flags are read when present.
              </p>
              <textarea
                id="manifest"
                className="textarea"
                spellCheck={false}
                aria-describedby="manifest-hint"
                aria-invalid={failure ? true : undefined}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setActiveSample(null);
                }}
              />
            </div>

            {failure ? (
              <p className="field-error" role="alert">
                <strong>{failure.message}</strong> {failure.hint}
              </p>
            ) : null}

            <div className="rail-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void run(text)}
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? "Reading grants" : dirty ? "Re-run scan" : "Analyse grants"}
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setText("");
                  setReport(null);
                  setFailure(null);
                  setActiveSample(null);
                  analyzedText.current = null;
                }}
              >
                Clear
              </button>
            </div>

            <p className="privacy-note">
              <span aria-hidden="true" className="mono">
                &#9632;
              </span>
              The scan runs in this browser tab. Your manifest is never uploaded.
            </p>
          </div>
        </section>
      </div>

      <div className="results">
        {failure && !report ? (
          <div className="empty">
            <p className="empty-title">That manifest could not be read</p>
            <p className="empty-body">
              {failure.message} {failure.hint}
            </p>
          </div>
        ) : null}

        {!report && !failure ? (
          <div className="empty">
            <p className="empty-title">No scan yet</p>
            <p className="empty-body">
              Paste a tool manifest on the left, or load a sample, to see every capability the agent
              holds and which of those grants are dangerous.
            </p>
            <div className="cluster" style={{ marginTop: "var(--space-2)" }}>
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="btn"
                  onClick={() => loadSample(sample.id)}
                >
                  Load {sample.label.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {report ? (
          <>
            <section className="panel verdict" aria-labelledby="verdict-heading">
              <div className="verdict-lead">
                <span className="verdict-label" id="verdict-heading">
                  Verdict
                </span>
                <span className="verdict-word">
                  <strong>{verdictWord(report)}</strong>
                  <SeverityChip
                    severity={report.verdict === "pass" ? "medium" : report.verdict}
                  />
                </span>
                <span className="verdict-subject">
                  {report.agent} &#183; {report.tools.length} tools &#183; {serverCount} servers
                  {report.loggingEnabled ? null : <> &#183; no audit trail declared</>}
                </span>
              </div>
              <div className="score">
                <span className="score-value">
                  <b>{report.score}</b>
                  <span>risk score out of 100</span>
                </span>
                <div className="meter">
                  <div
                    className="meter-track"
                    role="meter"
                    aria-valuenow={report.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Composite risk score"
                  >
                    <div className={meterClass(report)} style={{ width: `${Math.max(report.score, 2)}%` }} />
                  </div>
                  <div className="meter-legend">
                    <span>0, no findings</span>
                    <span>100, critical</span>
                  </div>
                </div>
              </div>
            </section>

            {report.truncated ? (
              <div className="notice notice-warn">
                <div className="notice-body">
                  <strong>Large manifest truncated</strong>
                  <span>
                    Only the first 400 tools were scanned. Split the manifest by server to cover the
                    rest.
                  </span>
                </div>
              </div>
            ) : null}

            {dirty ? (
              <div className="notice notice-info">
                <div className="notice-body">
                  <strong>Manifest edited since this result</strong>
                  <span>
                    The figures below describe the previous version. Run the scan again to refresh
                    them.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="stats">
              <div className="stat">
                <span className="stat-label">Critical</span>
                <span className="stat-value" style={{ color: report.counts.critical ? "var(--risk)" : undefined }}>
                  {report.counts.critical}
                </span>
                <span className="stat-note">Exfiltration or command execution</span>
              </div>
              <div className="stat">
                <span className="stat-label">High</span>
                <span className="stat-value" style={{ color: report.counts.high ? "var(--warn)" : undefined }}>
                  {report.counts.high}
                </span>
                <span className="stat-note">Unapproved or unbounded grants</span>
              </div>
              <div className="stat">
                <span className="stat-label">Medium</span>
                <span className="stat-value">{report.counts.medium}</span>
                <span className="stat-note">Review and hygiene</span>
              </div>
              <div className="stat">
                <span className="stat-label">Capabilities</span>
                <span className="stat-value">{report.capabilities.length}</span>
                <span className="stat-note">Distinct kinds of access held</span>
              </div>
            </div>

            <section aria-labelledby="findings-heading">
              <div className="section-head">
                <h2 id="findings-heading">Findings</h2>
                <div className="cluster">
                  <p>
                    Ordered by severity. Each one names the tools that produced it.
                  </p>
                  <button type="button" className="btn" onClick={() => void copySummary()}>
                    {copied ? "Copied" : "Copy as Markdown"}
                  </button>
                </div>
              </div>

              {report.findings.length === 0 ? (
                <div className="empty">
                  <p className="empty-title">No findings</p>
                  <p className="empty-body">
                    Nothing in this manifest matched a known risk pattern. That is not the same as
                    safe: the scan reads declared grants, not runtime behaviour.
                  </p>
                </div>
              ) : (
                <div className="findings">
                  {report.findings.map((finding) => (
                    <article key={finding.id} className={`panel finding finding-${finding.severity}`}>
                      <div className="finding-head">
                        <SeverityChip severity={finding.severity} />
                        <h3>{finding.title}</h3>
                        <span className="finding-rule">{finding.id}</span>
                      </div>
                      <div className="finding-body">
                        <div className="finding-block">
                          <span className="label">Why</span>
                          <p>{finding.why}</p>
                        </div>
                        <div className="finding-block">
                          <span className="label">Repair</span>
                          <p>{finding.repair}</p>
                        </div>
                        {finding.evidence.length > 0 ? (
                          <div className="finding-block">
                            <span className="label">Evidence</span>
                            <div className="evidence">
                              {finding.evidence.map((item, index) => (
                                <div className="evidence-row" key={`${item.tool}-${index}`}>
                                  <span>{item.tool}</span>
                                  <span>{item.detail}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="capability-heading">
              <div className="section-head">
                <h2 id="capability-heading">Capability inventory</h2>
                <p>
                  Declared means the manifest states it. Inferred means a heuristic read of the tool
                  name, description or scope, and it can be wrong in both directions.
                </p>
              </div>
              <div className="panel scroll-x">
                <table className="table">
                  <caption className="visually-hidden">
                    Every capability detected across the scanned tools
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Capability</th>
                      <th scope="col">Origin</th>
                      <th scope="col">Confidence</th>
                      <th scope="col">Granted by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.capabilities.map((row) => (
                      <tr key={row.id}>
                        <td className="mono">{row.id}</td>
                        <td>
                          <span className={`tag ${row.origin === "declared" ? "tag-declared" : ""}`}>
                            {row.origin}
                          </span>
                        </td>
                        <td className="mono">{row.confidence}</td>
                        <td className="mono">{row.tools.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        <section className="panel method" aria-labelledby="method-heading">
          <div className="method-col">
            <h3 id="method-heading">How the scan works</h3>
            <ol>
              <li>Each tool is read for name, description and scope.</li>
              <li>Those words map to a fixed capability lexicon.</li>
              <li>Rules run over the capability set, including combinations across tools.</li>
              <li>Every finding cites the tools and text that produced it.</li>
            </ol>
          </div>
          <div className="method-col">
            <h3>What it does not do</h3>
            <ul>
              <li>It reads declared grants, not runtime behaviour.</li>
              <li>Inferred capabilities are heuristic and can be wrong.</li>
              <li>It never executes code or contacts your servers.</li>
              <li>A clean result is not a security guarantee.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
