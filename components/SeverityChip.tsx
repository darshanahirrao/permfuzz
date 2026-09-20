import type { Severity } from "@/lib/types";

const LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span className={`sev sev-${severity}`}>
      <span className="sev-glyph" aria-hidden="true" />
      {LABEL[severity]}
    </span>
  );
}
