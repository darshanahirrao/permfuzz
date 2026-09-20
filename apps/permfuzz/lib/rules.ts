import type { CapabilityId, Finding, FindingEvidence, NormalizedTool } from "./types";
import { capabilityIds, findWildcardScopes } from "./infer";

const SENSITIVE: CapabilityId[] = [
  "shell.exec",
  "fs.delete",
  "data.write",
  "comm.send",
  "pay.spend",
  "secret.read",
  "identity.act",
];

function evidenceFor(
  tools: NormalizedTool[],
  predicate: (ids: Set<CapabilityId>) => boolean,
): FindingEvidence[] {
  return tools
    .filter((tool) => predicate(capabilityIds(tool)))
    .map((tool) => ({
      tool: `${tool.server}.${tool.name}`,
      detail: tool.capabilities.map((capability) => capability.id).join(", ") || "no capability recorded",
    }));
}

export function runRules(tools: NormalizedTool[], loggingEnabled: boolean): Finding[] {
  const findings: Finding[] = [];

  const readsPrivate = tools.filter((tool) => capabilityIds(tool).has("data.private"));
  const takesUntrusted = tools.filter((tool) => tool.untrustedInput);
  const canLeave = tools.filter((tool) => {
    const ids = capabilityIds(tool);
    return ids.has("net.egress") || ids.has("comm.send") || ids.has("net.fetch");
  });

  if (readsPrivate.length > 0 && takesUntrusted.length > 0 && canLeave.length > 0) {
    findings.push({
      id: "R-TRIFECTA",
      rule: "lethal trifecta",
      severity: "critical",
      title: "Private data, untrusted input and an outbound path exist in the same agent",
      why: "Any one of these is normal. Together they are an exfiltration path: text an outsider can author reaches the agent, the agent can read material it should not share, and it can send that material somewhere. No malicious tool is required, only a convincing sentence inside a document or message.",
      repair: "Break one leg. Remove the outbound capability from the tools that read private data, route all outbound calls through a review step, or keep untrusted content out of the context that can reach a send tool.",
      evidence: [
        ...evidenceFor(readsPrivate, (ids) => ids.has("data.private")).slice(0, 3),
        ...evidenceFor(takesUntrusted, (ids) => ids.has("data.private") || ids.has("net.fetch")).slice(0, 3),
        ...evidenceFor(canLeave, (ids) => ids.has("net.egress") || ids.has("comm.send")).slice(0, 3),
      ],
    });
  }

  const shellTools = tools.filter((tool) => capabilityIds(tool).has("shell.exec"));
  if (shellTools.length > 0) {
    findings.push({
      id: "R-SHELL",
      rule: "unbounded command execution",
      severity: "critical",
      title: `Command execution granted to ${shellTools.length} tool${shellTools.length === 1 ? "" : "s"}`,
      why: "A shell grant is not scoped to anything. Whatever the agent can be talked into typing, it can run, and the blast radius is the machine plus every credential reachable from it.",
      repair: "Replace the shell tool with named operations. If a shell is genuinely required, run it in a disposable sandbox with no network and no mounted secrets, and require approval per command.",
      evidence: evidenceFor(shellTools, (ids) => ids.has("shell.exec")),
    });
  }

  const secretPlusNetwork = tools.filter((tool) => {
    const ids = capabilityIds(tool);
    return ids.has("secret.read") && (ids.has("net.egress") || ids.has("net.fetch"));
  });
  if (secretPlusNetwork.length > 0) {
    findings.push({
      id: "R-SECRET-EGRESS",
      rule: "credentials reachable from a network tool",
      severity: "critical",
      title: "One tool both reads credentials and talks to the network",
      why: "Reading a secret is survivable while it stays local. The moment the same tool can make a request, a single injected instruction turns a credential into a disclosure.",
      repair: "Move credential access into a separate tool with no network capability, and have the network tool receive a short-lived scoped token instead of the secret itself.",
      evidence: evidenceFor(secretPlusNetwork, (ids) => ids.has("secret.read")),
    });
  }

  const destructiveAuto = tools.filter((tool) => {
    const ids = capabilityIds(tool);
    return (ids.has("fs.delete") || ids.has("data.write")) && tool.approval === "auto";
  });
  if (destructiveAuto.length > 0) {
    findings.push({
      id: "R-DESTRUCTIVE-AUTO",
      rule: "irreversible writes without approval",
      severity: "high",
      title: `${destructiveAuto.length} tool${destructiveAuto.length === 1 ? "" : "s"} can change or remove data with no approval step`,
      why: "Reads are recoverable. Deletes and overwrites are not, and a plausible-looking instruction is enough to trigger one. Auto approval removes the only point where a human sees the intent before it lands.",
      repair: "Require confirmation on every write and delete. Where the surface allows it, prefer a soft delete with a recovery window over hard removal.",
      evidence: evidenceFor(destructiveAuto, (ids) => ids.has("fs.delete") || ids.has("data.write")),
    });
  }

  const wildcardTools = tools
    .map((tool) => ({ tool, wildcards: findWildcardScopes(tool.scopes) }))
    .filter((entry) => entry.wildcards.length > 0);
  if (wildcardTools.length > 0) {
    findings.push({
      id: "R-WILDCARD",
      rule: "wildcard scope",
      severity: "high",
      title: `Wildcard scopes on ${wildcardTools.length} tool${wildcardTools.length === 1 ? "" : "s"}`,
      why: "A wildcard is a grant nobody can enumerate, which means nobody can review it either. It usually arrives as convenience during setup and then outlives the reason it was added.",
      repair: "Replace each wildcard with the specific scopes the tool actually calls. If that list is unknown, that is the finding: instrument the tool, collect the real calls, then narrow the grant.",
      evidence: wildcardTools.map(({ tool, wildcards }) => ({
        tool: `${tool.server}.${tool.name}`,
        detail: wildcards.join(", "),
      })),
    });
  }

  const sensitiveAuto = tools.filter((tool) => {
    const ids = capabilityIds(tool);
    const destructive = ids.has("fs.delete") || ids.has("data.write");
    return SENSITIVE.some((id) => ids.has(id)) && !destructive && tool.approval === "auto";
  });
  if (sensitiveAuto.length > 0) {
    findings.push({
      id: "R-AUTO-SENSITIVE",
      rule: "sensitive action without approval",
      severity: "high",
      title: `${sensitiveAuto.length} sensitive tool${sensitiveAuto.length === 1 ? "" : "s"} act without confirmation`,
      why: "Sending mail, spending money, acting as a user and reading secrets all produce consequences outside the agent. Auto approval means the first human to notice is the recipient.",
      repair: "Mark these tools approval required, and keep the automatic path for actions that are cheap to undo.",
      evidence: evidenceFor(sensitiveAuto, (ids) => SENSITIVE.some((id) => ids.has(id))),
    });
  }

  const uncappedSpend = tools.filter(
    (tool) => capabilityIds(tool).has("pay.spend") && !tool.spendCapped,
  );
  if (uncappedSpend.length > 0) {
    findings.push({
      id: "R-SPEND",
      rule: "unbounded spend",
      severity: "high",
      title: `${uncappedSpend.length} tool${uncappedSpend.length === 1 ? "" : "s"} can spend with no declared ceiling`,
      why: "Money is the one capability where a retry loop and an attack look identical. Without a declared limit, both produce the same invoice.",
      repair: "Declare a per-call and a per-day ceiling in the tool limits, enforce it outside the agent process, and alert on the first breach rather than the monthly total.",
      evidence: evidenceFor(uncappedSpend, (ids) => ids.has("pay.spend")),
    });
  }

  const untrustedWriters = tools.filter((tool) => {
    const ids = capabilityIds(tool);
    return (
      tool.untrustedInput &&
      (ids.has("data.write") || ids.has("fs.write") || ids.has("comm.send"))
    );
  });
  if (untrustedWriters.length > 0) {
    findings.push({
      id: "R-INJECTION-WRITE",
      rule: "untrusted input reaches a write",
      severity: "high",
      title: "Content the agent did not author can still cause a write",
      why: "This is prompt injection with a destination. Text inside a page, an email or a ticket becomes an instruction that ends in a stored change or an outbound message.",
      repair: "Keep ingested content clearly separated from instructions, and require approval on any write triggered by content the agent read rather than by the operator.",
      evidence: evidenceFor(
        untrustedWriters,
        (ids) => ids.has("data.write") || ids.has("fs.write") || ids.has("comm.send"),
      ),
    });
  }

  if (!loggingEnabled) {
    findings.push({
      id: "R-NO-LOGGING",
      rule: "no audit trail",
      severity: "medium",
      title: "The manifest declares no logging",
      why: "Every rule above is easier to catch and cheaper to contain with a record of what the agent actually did. Without one, an incident becomes a reconstruction exercise.",
      repair: "Log the tool name, arguments, approval decision and outcome for each call, and send the record somewhere the agent itself cannot edit.",
      evidence: [],
    });
  }

  const servers = new Set(tools.map((tool) => tool.server));
  if (servers.size >= 4) {
    findings.push({
      id: "R-BLAST-RADIUS",
      rule: "blast radius",
      severity: "medium",
      title: `One agent holds grants across ${servers.size} systems`,
      why: "A single compromised instruction inherits every system the agent can reach. Concentration expands what one mistake can touch, and it makes least-privilege review harder to hold.",
      repair: "Split the agent by trust boundary so the part reading untrusted content holds the fewest grants, and the part with broad access never reads outside content directly.",
      evidence: [...servers].map((server) => ({ tool: server, detail: "server" })),
    });
  }

  const order: Record<Finding["severity"], number> = { critical: 0, high: 1, medium: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));
}
