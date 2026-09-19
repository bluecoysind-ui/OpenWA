export function pageWindow(current: number, totalPages: number, size = 5): number[] {
  if (totalPages <= 0) return [];
  const clamped = Math.min(Math.max(current, 1), totalPages);
  const count = Math.min(size, totalPages);
  let start = clamped - Math.floor(count / 2);
  start = Math.max(1, Math.min(start, totalPages - count + 1));
  return Array.from({ length: count }, (_, i) => start + i);
}
