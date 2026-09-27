// Tiny class joiner for the ui primitives. Not a tailwind-merge: callers
// pass `className` for layout (margins, width, grid placement), never to
// override a primitive's own visual classes, so conflicts do not arise.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
