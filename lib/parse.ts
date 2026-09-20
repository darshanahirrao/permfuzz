import type { Approval, NormalizedTool, ParsedManifest } from "./types";
import { inferCapabilities, detectUntrustedInput, hasSpendCap } from "./infer";

/** Tools taken from one manifest before the scan is capped, to bound worst-case work. */
export const MAX_TOOLS = 400;

export class ManifestError extends Error {
  constructor(message: string, readonly hint: string) {
    super(message);
    this.name = "ManifestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeApproval(value: unknown): Approval {
  const raw = asString(value).toLowerCase();
  if (raw === "required" || raw === "manual" || raw === "confirm" || raw === "ask") {
    return "required";
  }
  // Absent approval metadata is treated as automatic, which is the unsafe default
  // and the one a reviewer should see.
  return "auto";
}

export function parseManifest(input: string): ParsedManifest {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new ManifestError("Nothing to analyse.", "Paste a manifest, or load one of the samples.");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown parse error.";
    throw new ManifestError(
      "That is not valid JSON.",
      `Check for a trailing comma or an unquoted key. Parser said: ${detail}`,
    );
  }

  if (!isRecord(data)) {
    throw new ManifestError(
      "The manifest must be a JSON object.",
      'Wrap your tools in an object with a "tools" or "servers" key.',
    );
  }

  const root = data;
  const agent = asString(root.agent, asString(root.name, "unnamed agent"));
  const servers = Array.isArray(root.servers) ? root.servers : [];
  const flatTools = Array.isArray(root.tools) ? root.tools : [];

  const collected: { server: string; raw: Record<string, unknown> }[] = [];

  for (const server of servers) {
    if (!isRecord(server)) continue;
    const serverName = asString(server.name, "server");
    const serverTools = Array.isArray(server.tools) ? server.tools : [];
    for (const tool of serverTools) {
      if (isRecord(tool)) collected.push({ server: serverName, raw: tool });
    }
  }

  for (const tool of flatTools) {
    if (isRecord(tool)) {
      collected.push({ server: asString(tool.server, "tools"), raw: tool });
    }
  }

  if (collected.length === 0) {
    throw new ManifestError(
      "No tools found in this manifest.",
      'Add a "tools" array, or a "servers" array where each server has its own "tools".',
    );
  }

  const truncated = collected.length > MAX_TOOLS;
  const limited = collected.slice(0, MAX_TOOLS);

  const tools: NormalizedTool[] = limited.map(({ server, raw }, index) => {
    const name = asString(raw.name, asString(raw.tool, `tool_${index + 1}`));
    const description = asString(raw.description, "");
    const scopes = asStringArray(raw.scopes ?? raw.scope ?? raw.permissions);
    const approval = normalizeApproval(raw.approval ?? raw.confirmation ?? raw.requiresApproval);
    const text = [name, description, scopes.join(" ")].join(" \n ");

    return {
      server,
      name,
      description,
      scopes,
      approval,
      capabilities: inferCapabilities({ text, scopes }),
      untrustedInput: detectUntrustedInput(text),
      spendCapped: hasSpendCap(raw),
    };
  });

  const logging = root.logging;
  const loggingEnabled =
    logging === true ||
    (isRecord(logging) && logging.enabled !== false);

  return { agent, tools, loggingEnabled, truncated };
}
