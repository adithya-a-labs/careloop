interface Entry { value: unknown; storedAt: number }
export const readCache = new Map<string, Entry>();
export let cacheRevision = 0;

export function invalidateReads(circleId?: string) {
  cacheRevision += 1;
  for (const [key, entry] of readCache) {
    if (!circleId || key.includes(`/circles/${circleId}/`)) entry.storedAt = 0;
  }
}

export function reconcileReadCache(
  circleId: string, resource: string, row: Record<string, unknown>, deleted = false,
) {
  invalidateReads(circleId);
  if (!row.id) return;
  for (const [key, entry] of readCache) {
    if (!key.includes(`/circles/${circleId}/${resource}?`) || !Array.isArray(entry.value)) continue;
    const rows = entry.value as Array<Record<string, unknown>>;
    const existing = rows.some((item) => item.id === row.id);
    // Do not insert a row into another viewer's cached permission-filtered result.
    if (deleted) entry.value = rows.filter((item) => item.id !== row.id);
    else if (existing) entry.value = rows.map((item) => item.id === row.id ? row : item);
  }
}
