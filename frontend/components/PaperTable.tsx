import Link from "next/link";
import type { Paper } from "@/lib/api";
import { formatDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";

/** Compact density view of the library: title, year, status, cites, added. */
export default function PaperTable({ papers }: { papers: Paper[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Library papers">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-1 pr-3 font-medium">Title</th>
            <th className="px-2 font-medium">Year</th>
            <th className="px-2 font-medium">Status</th>
            <th className="px-2 text-right font-medium">Cites</th>
            <th className="pl-2 font-medium">Added</th>
          </tr>
        </thead>
        <tbody>
          {papers.map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0 hover:bg-hover">
              <td className="max-w-0 w-full py-1 pr-3">
                <Link href={`/papers/${p.id}`} className="block truncate hover:text-accent" title={p.title}>
                  {p.title}
                </Link>
              </td>
              <td className="px-2 whitespace-nowrap text-muted">{p.year ?? "—"}</td>
              <td className="px-2 whitespace-nowrap">
                <StatusBadge status={p.reading_status} />
              </td>
              <td className="px-2 text-right tabular-nums text-muted">{p.citation_count ?? "—"}</td>
              <td className="pl-2 whitespace-nowrap tabular-nums text-muted">{formatDate(p.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
