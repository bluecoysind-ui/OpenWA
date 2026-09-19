interface Page<T> {
  data: T[];
  total: number;
}

export async function fetchAllPages<T>(
  fetchPage: (limit: number, offset: number) => Promise<Page<T>>,
  { pageSize = 200, maxItems = 50_000 }: { pageSize?: number; maxItems?: number } = {},
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const { data, total } = await fetchPage(pageSize, offset);
    all.push(...data);
    offset += data.length;
    if (data.length === 0 || offset >= total || all.length >= maxItems) break;
  }
  return all;
}
