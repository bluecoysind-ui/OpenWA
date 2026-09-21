/** Escape `%`, `_`, and `\` so a caller-supplied search string is matched literally in LIKE. */
export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Hard page size when `q` is set, so a body search cannot scan an unbounded session. */
export const MESSAGE_BODY_SEARCH_MAX = 50;
/** Cap on the raw `q` string (after trim), independent of the page size. */
export const MESSAGE_BODY_SEARCH_Q_MAX = 200;
