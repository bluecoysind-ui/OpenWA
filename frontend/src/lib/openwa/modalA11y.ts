/** Focus trap helper for modal dialogs. */
export function trapFocus(container: HTMLElement, onEscape?: () => void) {
  const focusable = () =>
    [...container.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter(
      (el) => !el.hasAttribute("disabled"),
    );
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onEscape?.();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = focusable();
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener("keydown", onKey);
  const nodes = focusable();
  nodes[0]?.focus();
  return () => container.removeEventListener("keydown", onKey);
}
