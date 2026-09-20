import type { Capability, CapabilityId } from "./types";

interface Rule {
  id: CapabilityId;
  /** Strong patterns name the capability outright. */
  strong: RegExp[];
  /** Weak patterns suggest it and need a second signal to count. */
  weak: RegExp[];
  /** Scope fragments that declare the capability rather than imply it. */
  scopeDeclares?: RegExp[];
}

/**
 * A readable lexicon, not a model. Every match is surfaced with its evidence so a
 * reviewer can see exactly which words produced which capability.
 */
const RULES: Rule[] = [
  {
    id: "shell.exec",
    strong: [/\b(shell|bash|zsh|sh|powershell|terminal|subprocess|exec|spawn|run_command)\b/i],
    weak: [/\b(run|execute|command)\b/i],
    scopeDeclares: [/\b(exec|shell|process)\b/i],
  },
  {
    id: "fs.delete",
    strong: [/\b(delete|remove|unlink|purge|destroy|truncate)\b/i],
    weak: [/\brm\b/i],
    scopeDeclares: [/\b(delete|write)\b/i],
  },
  {
    id: "fs.write",
    strong: [/\b(write_file|writefile|save_file|create_file|append|mkdir|upload_file|patch_file|edit_file)\b/i],
    weak: [/\b(write|save|create|move|rename|upload|modify)\b/i],
    scopeDeclares: [/\b(write|create|modify)\b/i],
  },
  {
    id: "fs.read",
    strong: [/\b(read_file|readfile|read_text|list_files|ls_files|cat_file|open_file)\b/i],
    weak: [/\b(read|open|load|list|inspect)\b/i],
    scopeDeclares: [/\bread\b/i],
  },
  {
    id: "identity.act",
    strong: [/\b(impersonate|act_as|login_as|sudo|assume_role|on_behalf_of)\b/i],
    weak: [/\b(session|account|user context)\b/i],
    scopeDeclares: [/\b(admin|impersonat|act_as)\b/i],
  },
  {
    id: "secret.read",
    strong: [
      /\b(api[_\s-]?key|access[_\s-]?token|client_secret|private[_\s-]?key|credential|password|passwd|secret)\b/i,
      /\benv(ironment)?[_\s-]?(var|file|secret)/i,
      /\.env\b/i,
    ],
    weak: [/\b(auth|token|keychain|vault)\b/i],
    scopeDeclares: [/\b(secrets?|credentials?)\b/i],
  },
  {
    id: "pay.spend",
    strong: [/\b(payment|purchase|checkout|refund|transfer_funds|wire|charge_card|invoice_pay|settle)\b/i],
    weak: [/\b(pay|charge|spend|billing|price|budget)\b/i],
    scopeDeclares: [/\b(payments?|billing|wallet|financial)\b/i],
  },
  {
    id: "comm.send",
    strong: [
      /\b(send_email|send_message|send_sms|post_message|publish_post|send_slack|send_whatsapp|send_telegram|tweet|notify_user)\b/i,
      /\b(send|post|publish|reply|message)\b[^\n]{0,30}\b(email|mail|slack|sms|whatsapp|telegram|discord|tweet|x post|channel|dm|recipient)\b/i,
    ],
    weak: [/\b(send|post|publish|reply|dm|broadcast)\b/i],
    scopeDeclares: [/\b(send|compose|post|messag)/i],
  },
  {
    id: "net.egress",
    strong: [
      /\b(webhook|outbound|egress|post_request|http_post|curl\b)/i,
      /\b(upload|exfiltrat|forward_to|send_to_url)\b/i,
    ],
    weak: [/\b(request|http|api call|endpoint|url)\b/i],
  },
  {
    id: "net.fetch",
    strong: [/\b(fetch_url|http_get|browse|scrape|crawl|web_search|search_web|download_url)\b/i],
    weak: [/\b(fetch|download|retrieve|browse|request|search)\b/i],
    scopeDeclares: [/\b(read|fetch|network)\b/i],
  },
  {
    id: "data.write",
    strong: [
      /\b(insert|update_record|upsert|create_record|write_row|delete_record|mutate|patch_record)\b/i,
    ],
    weak: [/\b(update|create|insert|save|set|patch|delete)\b/i],
    scopeDeclares: [/\b(write|manage|modify)\b/i],
  },
  {
    id: "data.private",
    strong: [
      /\b(patient|medical record|pii|personal data|customer data|user data|inbox|mailbox|private|confidential|payroll|tax|kyc)\b/i,
      /\b(email|message|document|invoice|contract|file)\b[^\n]{0,20}\b(content|body|attachment|text|data)\b/i,
    ],
    weak: [/\b(email|message|contact|record|customer|document|invoice|database|account|profile|order)\b/i],
    // Domain nouns only. A bare "read" scope describes network or file reading,
    // not personal data, and treating it as private data produced false trifectas.
    scopeDeclares: [
      /\b(mailbox|inbox|messages?|documents?|records?|customers?|users?|patients?|invoices?|contacts?|profiles?|files?|personal|private|confidential|pii|kyc)\b/i,
    ],
  },
];

const UNTRUSTED_PATTERNS: RegExp[] = [
  /\b(web|url|http|website|webpage|browse|scrape|crawl|search result)\b/i,
  /\b(email|inbox|mail|message|dm|comment|ticket|issue|review|form submission)\b/i,
  /\b(user input|untrusted|external content|third[-\s]?party|uploaded|attachment|pdf|csv|docx?)\b/i,
];

const SPEND_CAP_KEYS = [
  "maxspend",
  "spendlimit",
  "budget",
  "maxamount",
  "cap",
  "limit",
  "max_usd",
  "maxusd",
];

export function detectUntrustedInput(text: string): boolean {
  return UNTRUSTED_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasSpendCap(raw: Record<string, unknown>): boolean {
  const limits = raw.limits;
  if (typeof limits === "object" && limits !== null) {
    for (const [key, value] of Object.entries(limits)) {
      if (SPEND_CAP_KEYS.includes(key.toLowerCase())) {
        const numeric = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(numeric) && numeric > 0) return true;
      }
    }
  }
  for (const key of Object.keys(raw)) {
    if (SPEND_CAP_KEYS.includes(key.toLowerCase())) {
      const value = raw[key];
      const numeric = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return true;
    }
  }
  return false;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0].trim();
  }
  return null;
}

export function inferCapabilities(input: { text: string; scopes: string[] }): Capability[] {
  const { text, scopes } = input;
  const scopeText = scopes.join(" ");
  const found: Capability[] = [];

  for (const rule of RULES) {
    const scopeHit = rule.scopeDeclares ? firstMatch(scopeText, rule.scopeDeclares) : null;
    const strongHit = firstMatch(text, rule.strong);
    const weakHits = rule.weak.filter((pattern) => pattern.test(text)).length;

    if (scopeHit) {
      found.push({
        id: rule.id,
        origin: "declared",
        confidence: "high",
        evidence: `scope: ${scopeHit}`,
      });
      continue;
    }

    if (strongHit) {
      found.push({
        id: rule.id,
        origin: "inferred",
        confidence: "high",
        evidence: `text: ${strongHit}`,
      });
      continue;
    }

    if (weakHits >= 2) {
      found.push({
        id: rule.id,
        origin: "inferred",
        confidence: "medium",
        evidence: "two ambiguous signals",
      });
    }
  }

  return found;
}

/** Wildcards widen a grant beyond anything the author could enumerate. */
export function findWildcardScopes(scopes: string[]): string[] {
  return scopes.filter((scope) =>
    /\*|(^|[^a-z])all([^a-z]|$)|full[_-]?access|(^|[^a-z])admin([^a-z]|$)/i.test(scope),
  );
}

export function capabilityIds(tool: { capabilities: Capability[] }): Set<CapabilityId> {
  return new Set(tool.capabilities.map((capability) => capability.id));
}
