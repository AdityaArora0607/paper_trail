export default function Legend() {
  const dot = (cls: string, extra = "") => (
    <span className={`inline-block h-3 w-3 rounded-full border ${cls} ${extra}`} aria-hidden />
  );
  const line = (color: string, h: number, op = 1) => (
    <span className="inline-block w-6" aria-hidden style={{ borderTop: `${h}px solid ${color}`, opacity: op }} />
  );
  return (
    <div
      aria-label="Graph legend"
      className="rounded border border-line bg-panel/90 p-2 text-[11px] leading-5 shadow-sm backdrop-blur"
    >
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2">
        {dot("bg-amber-500 border-amber-700")}
        <span>This paper</span>
        {dot("bg-blue-600 border-blue-800")}
        <span>In library</span>
        {dot("bg-slate-400 border-slate-500")}
        <span>Other</span>
        {dot("bg-slate-400 border-green-600 border-[3px]")}
        <span>Read (green ring)</span>
        {line("#475569", 2)}
        <span>Citation with context</span>
        {line("#94a3b8", 1, 0.5)}
        <span>No context</span>
        {line("#7c3aed", 2)}
        <span>Methodology</span>
      </div>
      <div className="mt-1 text-muted">Arrows: citing → cited. Size = log citations.</div>
    </div>
  );
}
