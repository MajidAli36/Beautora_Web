/**
 * Restore a soft-deleted row matched by organization + name (unique-name tables).
 * Used when re-creating a category/chair/service that was soft-deleted.
 */

type DbClient = {
  from: (table: string) => any;
};

export async function restoreSoftDeletedByName(input: {
  client: DbClient;
  table: string;
  organizationId: string;
  name: string;
  extraUpdate?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  const { client, table, organizationId, name, extraUpdate } = input;
  const trimmed = name.trim();
  // Exact name match only — ilike treats _/% as wildcards and can revive the wrong row.
  const { data: deleted } = await client
    .from(table)
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", trimmed)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!deleted?.id) return null;

  const { data: restored, error } = await client
    .from(table)
    .update({
      deleted_at: null,
      name: trimmed,
      updated_at: new Date().toISOString(),
      ...(extraUpdate ?? {}),
    })
    .eq("id", deleted.id)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !restored?.id) {
    console.error(`[restore] ${table} restore failed`, error?.message);
    return null;
  }
  return { id: restored.id as string };
}
