// Input — text-style input with the one border, radius and focus ring.
// Always 16 px on phones (iOS zooms below that; app/globals.css also
// forces it) and 14 px from sm up. Placeholders are text-wn-muted, the
// AA text colour (wn-subtle is 4.35:1 on off-white, icons and decoration
// only). `invalid` flips the border to the danger colour and sets
// aria-invalid; Field wires the describedby ids.
//
//   font  "text" (default) or "code" for one-time codes: centred, mono,
//         22 px, wide tracking. A prop rather than className because two
//         font-size utilities on one element resolve by stylesheet order,
//         not by class order.

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

type Font = "text" | "code";

const FONT: Record<Font, string> = {
  text: "text-base sm:text-sm",
  code: "text-center font-mono text-wn-xl tracking-[0.4em]",
};

export const inputClasses = (invalid?: boolean, className?: string, font: Font = "text") =>
  cx(
    "block w-full rounded-wn-sm border bg-white px-3 text-wn-charcoal placeholder:text-wn-muted",
    FONT[font],
    "focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/25",
    "disabled:cursor-not-allowed disabled:bg-wn-offwhite disabled:opacity-70",
    invalid ? "border-wn-danger" : "border-wn-line hover:border-wn-subtle",
    className,
  );

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  invalid?: boolean;
  font?: Font;
  className?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, font = "text", className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx("min-h-11", inputClasses(invalid, className, font))} {...rest} />;
});

export default Input;

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  invalid?: boolean;
  className?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cx("min-h-24 py-2.5", inputClasses(invalid, className))} {...rest} />;
});
