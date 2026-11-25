export default function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "li" | "section" | "article" }) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp className={`rounded-lg border border-line bg-panel p-3 ${className}`} {...rest}>
      {children}
    </Comp>
  );
}
