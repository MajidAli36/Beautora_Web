/** PostgREST default max_rows — pages at this size may be silently truncated. */
export const POSTGREST_PAGE = 1000;

/**
 * Sale-id IN() chunk size. Keep small so each chunk's sale_items stay under
 * PostgREST max_rows even for dense tickets.
 */
export const SAFE_SALE_ID_CHUNK = 40;

export function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** Fetch every page via `.range(from, to)` until a short page. */
export async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = POSTGREST_PAGE
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
