export async function pendingImageCleanup(
  db: D1Database,
  orgId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT b.id FROM image_builds b JOIN image_build_jobs j ON j.build_id = b.id WHERE b.org_id = ? AND j.phase IN ('allocating', 'cleanup', 'cleanup-build') AND b.state != 'running' ORDER BY b.started_at, b.id LIMIT 1",
    )
    .bind(orgId)
    .first<{ id: string }>()
  return row?.id ?? null
}
