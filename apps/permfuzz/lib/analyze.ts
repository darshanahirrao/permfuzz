import { parseManifest } from "./parse";
import { runRules } from "./rules";
import type { CapabilityId, CapabilityRow, Report, Severity, Verdict } from "./types";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 40,
  high: 15,
  medium: 5,
};

/**
 * Saturating score, so a long list of medium findings cannot outrank one critical
 * finding. Deterministic: the same manifest always produces the same number.
 */
function scoreFindings(counts: Record<Severity, number>): number {
  const raw =
    counts.critical * SEVERITY_WEIGHT.critical +
    counts.high * SEVERITY_WEIGHT.high +
    counts.medium * SEVERITY_WEIGHT.medium;
  if (raw === 0) return 0;
  return Math.round(100 * (1 - Math.exp(-raw / 55)));
}

function verdictFor(counts: Record<Severity, number>): Verdict {
  if (counts.critical > 0) return "critical";
  if (counts.high > 0) return "high";
  if (counts.medium > 0) return "medium";
  return "pass";
}

const CAPABILITY_ORDER: CapabilityId[] = [
  "shell.exec",
  "secret.read",
  "pay.spend",
  "identity.act",
  "fs.delete",
  "fs.write",
  "data.write",
  "data.private",
  "comm.send",
  "net.egress",
  "net.fetch",
  "fs.read",
];

function buildCapabilityRows(tools: Report["tools"]): CapabilityRow[] {
  const rows = new Map<CapabilityId, CapabilityRow>();

  for (const tool of tools) {
    for (const capability of tool.capabilities) {
      const label = `${tool.server}.${tool.name}`;
      const existing = rows.get(capability.id);
      if (!existing) {
        rows.set(capability.id, {
          id: capability.id,
          origin: capability.origin,
          confidence: capability.confidence,
          tools: [label],
        });
        continue;
      }
      existing.tools.push(label);
      if (existing.origin !== capability.origin) existing.origin = "mixed";
      if (capability.confidence === "high") existing.confidence = "high";
    }
  }

  return [...rows.values()].sort(
    (a, b) => CAPABILITY_ORDER.indexOf(a.id) - CAPABILITY_ORDER.indexOf(b.id),
  );
}

export function analyze(input: string): Report {
  const parsed = parseManifest(input);
  const findings = runRules(parsed.tools, parsed.loggingEnabled);

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0 };
  for (const finding of findings) counts[finding.severity] += 1;

  return {
    agent: parsed.agent,
    tools: parsed.tools,
    findings,
    counts,
    verdict: verdictFor(counts),
    score: scoreFindings(counts),
    capabilities: buildCapabilityRows(parsed.tools),
    loggingEnabled: parsed.loggingEnabled,
    truncated: parsed.truncated,
  };
}
