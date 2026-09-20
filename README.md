# permfuzz

**See what your agent can actually touch.**

Static permission analysis for AI agent tool grants. Paste a tool manifest and
permfuzz maps every capability the agent holds, then runs the rules that catch
the combinations people miss.

Live: **https://permfuzz.vercel.app**

## What it finds

Ten rules over twelve capability classes, including:

- **The lethal trifecta.** Private data, untrusted input and an outbound path in
  the same agent. Any one is normal. Together they are an exfiltration path, and
  no malicious tool is required, only a convincing sentence inside a document.
- **Credentials reachable from a network tool.** One tool that both reads a
  secret and makes a request.
- **Unbounded command execution.** A shell grant is not scoped to anything.
- **Irreversible writes without approval.** Deletes and overwrites with no
  confirmation step.
- **Wildcard scopes.** Grants nobody can enumerate, so nobody can review them.
- **Unbounded spend.** Money is the one capability where a retry loop and an
  attack look identical.
- **Prompt injection with a destination.** Untrusted content that can still
  cause a write or an outbound message.
- **No audit trail, and unmanaged blast radius.**

Every finding cites the tools and the text that produced it, and says what to
change.

## How it works

1. Each tool is read for name, description and scope.
2. Those words map to a fixed capability lexicon, marked **declared** when the
   manifest states it and **inferred** when it is a heuristic read.
3. Rules run over the capability set, including combinations across separate
   tools.

A readable lexicon and a rule table, not a model. You can see exactly why
anything was flagged.

## What it does not do

- It reads declared grants, not runtime behaviour.
- Inferred capabilities are heuristic and can be wrong in both directions.
- It never executes code and never contacts your servers.
- A clean result is not a security guarantee.

## Privacy

The scan runs entirely in your browser. No manifest is uploaded, and there is no
backend.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 18 engine tests
npm run typecheck
```

## Use it as a library

The analyser is plain TypeScript with no framework dependency:

```ts
import { analyze } from "./lib/analyze";

const report = analyze(manifestJson);
report.verdict;   // "critical" | "high" | "medium" | "pass"
report.score;     // 0 to 100, deterministic
report.findings;  // each with severity, why, repair, evidence
```

## Manifest format

```json
{
  "agent": "support-triage",
  "logging": { "enabled": true },
  "servers": [
    {
      "name": "gmail",
      "tools": [
        {
          "name": "send_email",
          "description": "Send a reply to a customer.",
          "scopes": ["gmail.send"],
          "approval": "required"
        }
      ]
    }
  ]
}
```

A flat `tools` array also works. Scopes and an `approval` flag are read when
present, and a missing approval value is treated as automatic.

## License

MIT
