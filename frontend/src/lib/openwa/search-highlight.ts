export function renderHighlightedSnippet(snippet: string): { text: string; marked: boolean }[] {
  if (!snippet) return [{ text: "", marked: false }];
  return snippet
    .split(/<\/?mark>/)
    .map((text, i) => ({ text, marked: i % 2 === 1 }))
    .filter((seg) => seg.text.length > 0);
}

export function buildSearchParams(
  q: string,
  scope?: { sessionId?: string; chatId?: string },
  paging?: { limit?: number; offset?: number },
): { q: string; sessionId?: string; chatId?: string; limit?: number; offset?: number } | null {
  const trimmed = q.trim();
  if (!trimmed) return null;
  return {
    q: trimmed,
    sessionId: scope?.sessionId,
    chatId: scope?.chatId,
    limit: paging?.limit,
    offset: paging?.offset,
  };
}
