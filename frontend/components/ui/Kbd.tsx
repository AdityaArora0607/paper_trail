export default function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-hover px-1 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  );
}
