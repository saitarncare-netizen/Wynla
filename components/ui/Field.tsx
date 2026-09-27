// Field — label + control + hint + error, wired for assistive tech.
//
//   <Field label="Email" hint="We only email the code." error={err}>
//     {(a11y) => <Input {...a11y} type="email" />}
//   </Field>
//
// The render-prop hands the control the generated `id`, the combined
// `aria-describedby` (hint and error ids, whichever exist) and `invalid`.
// The error paragraph carries role="alert" so screen readers announce it
// when it appears; the hint is plain text so it is read once, on focus.

import { useId, type ReactNode } from "react";
import { cx } from "./cx";

export type FieldA11y = {
  id: string;
  "aria-describedby": string | undefined;
  invalid: boolean;
};

export type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Visually hide the label (the placeholder is NOT a label). */
  hideLabel?: boolean;
  className?: string;
  children: (a11y: FieldA11y) => ReactNode;
};

export default function Field({ label, hint, error, hideLabel = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={id} className={cx("block text-sm font-semibold text-wn-charcoal", hideLabel && "sr-only")}>
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-xs text-wn-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-wn-danger">
          {error}
        </p>
      )}
    </div>
  );
}
