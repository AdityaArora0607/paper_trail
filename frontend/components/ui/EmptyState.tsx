export default function EmptyState({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-dashed border-line px-4 py-8 text-center ${className}`}>
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 text-sm text-muted max-w-md mx-auto">{children}</p>}
      {action && <div className="mt-3 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
