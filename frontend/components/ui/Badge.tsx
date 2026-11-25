export type BadgeTone = "neutral" | "accent" | "success" | "warn" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-hover text-muted border-line",
  accent: "bg-accent/10 text-accent border-accent/30",
  success: "bg-success/10 text-success border-success/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  danger: "bg-danger/10 text-danger border-danger/30",
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
  title,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 text-[11px] leading-5 font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
