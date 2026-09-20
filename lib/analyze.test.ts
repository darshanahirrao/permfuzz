import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { ManifestError, parseManifest } from "./parse";
import { SAMPLES } from "./samples";
import { inferCapabilities } from "./infer";

const support = SAMPLES.find((sample) => sample.id === "support")!;
const research = SAMPLES.find((sample) => sample.id === "research")!;
const payments = SAMPLES.find((sample) => sample.id === "payments")!;

function ruleIds(manifest: string): string[] {
  return analyze(manifest).findings.map((finding) => finding.id);
}

describe("parse", () => {
  it("rejects empty input with a repair hint", () => {
    expect(() => parseManifest("   ")).toThrow(ManifestError);
    try {
      parseManifest("");
    } catch (error) {
      expect((error as ManifestError).hint).toContain("samples");
    }
  });

  it("rejects malformed JSON and says what to check", () => {
    try {
      parseManifest('{"tools": [},]}');
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestError);
      expect((error as ManifestError).hint).toContain("trailing comma");
    }
  });

  it("rejects a manifest with no tools", () => {
    try {
      parseManifest('{"agent": "empty"}');
      throw new Error("expected a throw");
    } catch (error) {
      expect((error as ManifestError).message).toContain("No tools");
    }
  });

  it("reads tools from both flat and server-shaped manifests", () => {
    const flat = parseManifest('{"tools":[{"name":"read_file"}]}');
    expect(flat.tools).toHaveLength(1);
    expect(flat.tools[0]!.server).toBe("tools");

    const nested = parseManifest('{"servers":[{"name":"fs","tools":[{"name":"read_file"}]}]}');
    expect(nested.tools[0]!.server).toBe("fs");
  });

  it("treats missing approval metadata as automatic", () => {
    const parsed = parseManifest('{"tools":[{"name":"delete_record"}]}');
    expect(parsed.tools[0]!.approval).toBe("auto");
  });
});

describe("capability inference", () => {
  it("marks scope-derived capabilities as declared", () => {
    const caps = inferCapabilities({ text: "list invoices", scopes: ["invoices:read"] });
    const privateData = caps.find((capability) => capability.id === "data.private");
    expect(privateData?.origin).toBe("declared");
    expect(privateData?.confidence).toBe("high");
  });

  it("recognises shell grants from text and scope", () => {
    const caps = inferCapabilities({ text: "run a shell command", scopes: [] });
    expect(caps.map((capability) => capability.id)).toContain("shell.exec");
  });

  it("does not invent capabilities from unrelated text", () => {
    const caps = inferCapabilities({ text: "convert a colour to hex", scopes: [] });
    expect(caps.map((capability) => capability.id)).not.toContain("shell.exec");
    expect(caps.map((capability) => capability.id)).not.toContain("pay.spend");
  });
});

describe("rules", () => {
  it("finds the trifecta and unbounded shell in the support sample", () => {
    const ids = ruleIds(support.manifest);
    expect(ids).toContain("R-TRIFECTA");
    expect(ids).toContain("R-SHELL");
    expect(ids).toContain("R-WILDCARD");
  });

  it("flags uncapped spend with credential access in the billing sample", () => {
    const ids = ruleIds(payments.manifest);
    expect(ids).toContain("R-SPEND");
    expect(ids).toContain("R-SECRET-EGRESS");
  });

  it("keeps the narrow research sample clear of critical findings", () => {
    const report = analyze(research.manifest);
    expect(report.counts.critical).toBe(0);
    expect(report.verdict).not.toBe("critical");
  });

  it("reports a missing audit trail when logging is off", () => {
    expect(ruleIds(support.manifest)).toContain("R-NO-LOGGING");
  });

  it("always cites at least one tool for every rule except the logging check", () => {
    for (const finding of analyze(support.manifest).findings) {
      if (finding.id === "R-NO-LOGGING") continue;
      expect(finding.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe("report", () => {
  it("is deterministic across runs", () => {
    const first = analyze(support.manifest);
    const second = analyze(support.manifest);
    expect(first.score).toBe(second.score);
    expect(first.verdict).toBe(second.verdict);
    expect(first.findings.map((finding) => finding.id)).toEqual(
      second.findings.map((finding) => finding.id),
    );
  });

  it("rates the support sample critical and scores it highly", () => {
    const report = analyze(support.manifest);
    expect(report.verdict).toBe("critical");
    expect(report.score).toBeGreaterThan(70);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it("sorts findings by severity", () => {
    const severities = analyze(support.manifest).findings.map((finding) => finding.severity);
    const rank = { critical: 0, high: 1, medium: 2 } as const;
    const sorted = [...severities].sort((a, b) => rank[a] - rank[b]);
    expect(severities).toEqual(sorted);
  });

  it("builds a capability inventory with the granting tools", () => {
    const rows = analyze(support.manifest).capabilities;
    const shell = rows.find((row) => row.id === "shell.exec");
    expect(shell?.tools).toContain("ops.run_command");
  });

  it("returns a clean verdict when nothing fires", () => {
    const report = analyze(
      JSON.stringify({
        agent: "read-only",
        logging: true,
        tools: [{ name: "list_items", description: "List item names.", scopes: ["items:read"] }],
      }),
    );
    expect(report.counts.critical).toBe(0);
    expect(report.counts.high).toBe(0);
  });
});
