import Link from "next/link";
import type { Paper } from "@/lib/api";
import { authorsShort } from "@/lib/format";
import StatusBadge from "./StatusBadge";

export default function PaperRow({ paper }: { paper: Paper }) {
  return (
    <li className="py-2.5 px-2 -mx-2 rounded-md border-b border-line last:border-0 hover:bg-hover flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <Link href={`/papers/${paper.id}`} className="font-medium hover:text-accent">
          {paper.title}
        </Link>
        <div className="text-xs text-muted truncate">
          {authorsShort(paper.authors)} · {paper.year ?? "n.d."}
          {paper.venue ? ` · ${paper.venue}` : ""}
        </div>
      </div>
      <div className="text-xs text-muted whitespace-nowrap">
        {paper.citation_count !== null && <span title="citations">{paper.citation_count} cites</span>}
      </div>
      <StatusBadge status={paper.reading_status} />
    </li>
  );
}
