import { ApiError } from "@/lib/api";
import { Button, Badge as UiBadge, SkeletonList } from "./ui";

export function ErrorBanner({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const unreachable = error instanceof ApiError && error.unreachable;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger flex items-center gap-3"
    >
      <div className="flex-1">
        <strong>{unreachable ? "API unreachable" : "Request failed"}</strong>
        <span className="ml-2">{error.message}</span>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function Loading({ label = "Loading", rows = 4 }: { label?: string; rows?: number }) {
  return <SkeletonList rows={rows} label={label} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-muted py-4 text-sm">{children}</div>;
}

/** Renders loading skeleton / error with retry / empty / content for an async result. */
export function Async<T>({
  state,
  isEmpty,
  empty,
  skeletonRows,
  children,
}: {
  state: { data: T | null; error: Error | null; loading: boolean; reload: () => void };
  isEmpty?: (d: T) => boolean;
  empty?: React.ReactNode;
  skeletonRows?: number;
  children: (d: T) => React.ReactNode;
}) {
  if (state.error) return <ErrorBanner error={state.error} onRetry={state.reload} />;
  if (state.loading && state.data === null) return <Loading rows={skeletonRows} />;
  if (state.data === null) return null;
  if (isEmpty?.(state.data)) return <>{typeof empty === "string" || empty === undefined ? <Empty>{empty ?? "Nothing here yet."}</Empty> : empty}</>;
  return <>{children(state.data)}</>;
}

/** Back-compat wrapper: accepts a className instead of a tone. */
export function Badge({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <UiBadge title={title} className={className}>
      {children}
    </UiBadge>
  );
}
