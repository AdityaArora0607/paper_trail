import { forwardRef } from "react";

const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`h-8 rounded-md border border-line bg-panel px-2 text-sm ${className}`} {...rest}>
      {children}
    </select>
  );
});
export default Select;
