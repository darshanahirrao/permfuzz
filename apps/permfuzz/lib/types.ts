export type Severity = "critical" | "high" | "medium";

export type Verdict = "critical" | "high" | "medium" | "pass";

export type Approval = "auto" | "required";

export type CapabilityId =
  | "fs.read"
  | "fs.write"
  | "fs.delete"
  | "shell.exec"
  | "net.fetch"
  | "net.egress"
  | "secret.read"
  | "data.private"
  | "data.write"
  | "comm.send"
  | "pay.spend"
  | "identity.act";

export interface Capability {
  id: CapabilityId;
  /** declared: the manifest states it. inferred: a heuristic read of the tool. */
  origin: "declared" | "inferred";
  confidence: "high" | "medium" | "low";
  /** The text that produced this capability, so a reviewer can disagree with it. */
  evidence: string;
}

export interface NormalizedTool {
  server: string;
  name: string;
  description: string;
  scopes: string[];
  approval: Approval;
  capabilities: Capability[];
  /** Reads content an attacker could author: mail, web pages, files, tickets. */
  untrustedInput: boolean;
  /** Tool declares an explicit spend ceiling. */
  spendCapped: boolean;
}

export interface FindingEvidence {
  tool: string;
  detail: string;
}

export interface Finding {
  id: string;
  rule: string;
  severity: Severity;
  title: string;
  why: string;
  repair: string;
  evidence: FindingEvidence[];
}

export interface CapabilityRow {
  id: CapabilityId;
  origin: "declared" | "inferred" | "mixed";
  confidence: "high" | "medium" | "low";
  tools: string[];
}

export interface Report {
  agent: string;
  tools: NormalizedTool[];
  findings: Finding[];
  counts: Record<Severity, number>;
  verdict: Verdict;
  score: number;
  capabilities: CapabilityRow[];
  loggingEnabled: boolean;
  truncated: boolean;
}

export interface ParsedManifest {
  agent: string;
  tools: NormalizedTool[];
  loggingEnabled: boolean;
  truncated: boolean;
}
