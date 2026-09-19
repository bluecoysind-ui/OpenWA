export function shouldOfferStopOrphansRetry(
  status: number | undefined,
  code: string | undefined,
  alreadyRetriedWithStopOrphans: boolean,
): boolean {
  if (status !== 409) return false;
  if (alreadyRetriedWithStopOrphans) return false;
  return code === "IMPORT_WOULD_ORPHAN_ENGINES";
}
