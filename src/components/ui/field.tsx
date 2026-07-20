import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

export function Field({
  label,
  error,
  hint,
  required,
  children
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactElement<FieldControlProps> | ((props: FieldControlProps & { id: string }) => ReactNode);
}) {
  const generatedId = useId();
  const childProps = isValidElement<FieldControlProps>(children) ? children.props : undefined;
  const controlId = childProps?.id ?? generatedId;
  const messageId = `${controlId}-message`;
  const describedBy = [childProps?.["aria-describedby"], error || hint ? messageId : null]
    .filter(Boolean)
    .join(" ") || undefined;
  const accessibilityProps: FieldControlProps & { id: string } = {
    id: controlId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : childProps?.["aria-invalid"]
  };

  return (
    <div className="grid gap-2 text-sm font-medium text-foreground">
      <label htmlFor={controlId} className="leading-none">
        {label}
        {required ? <span className="ml-1 text-danger" aria-hidden="true">*</span> : null}
      </label>
      {typeof children === "function"
        ? children(accessibilityProps)
        : isValidElement<FieldControlProps>(children)
          ? cloneElement(children, accessibilityProps)
          : children}
      {error || hint ? (
        <span
          id={messageId}
          className={error ? "text-xs font-medium leading-5 text-danger" : "text-xs font-normal leading-5 text-muted-foreground"}
        >
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}
