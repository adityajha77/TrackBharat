import type { IssueStatus } from "@trackbharat/shared";
import { cn } from "@/lib/utils";

const STYLES: Record<IssueStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-surface-muted text-muted" },
  ACKNOWLEDGED: { label: "Acknowledged", cls: "bg-primary/12 text-primary" },
  RESOLVED: { label: "Resolved", cls: "bg-green/12 text-green" },
  HIDDEN: { label: "Hidden for review", cls: "bg-danger/12 text-danger" },
};

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const s = STYLES[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", s.cls)}>{s.label}</span>;
}
