export interface ScrollGeometry {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export type ScrollDirection = "incoming" | "outgoing";
export type ScrollAction = "bottom" | "preserve";

const DEFAULT_NEAR_BOTTOM_THRESHOLD = 100;

export function decideScroll(
  direction: ScrollDirection,
  geometry: ScrollGeometry,
  nearBottomThreshold: number = DEFAULT_NEAR_BOTTOM_THRESHOLD,
): ScrollAction {
  if (direction === "outgoing") return "bottom";
  const gap = geometry.scrollHeight - geometry.scrollTop - geometry.clientHeight;
  return gap < nearBottomThreshold ? "bottom" : "preserve";
}

const NEAR_TOP_THRESHOLD = 100;

export function shouldFetchOlderMessages(args: {
  isUserScroll: boolean;
  geometry: ScrollGeometry;
  hasMore: boolean;
  loading: boolean;
}): boolean {
  if (!args.isUserScroll || !args.hasMore || args.loading) return false;
  if (args.geometry.clientHeight >= args.geometry.scrollHeight) return false;
  return args.geometry.scrollTop <= NEAR_TOP_THRESHOLD;
}
