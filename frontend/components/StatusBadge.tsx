import type { ReadingStatus } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";
import { Badge } from "./ui";

export default function StatusBadge({ status }: { status: ReadingStatus | undefined }) {
  if (!status) return null;
  return <Badge tone={status === "reading" ? "warn" : status === "read" ? "success" : "neutral"}>{STATUS_LABEL[status]}</Badge>;
}
