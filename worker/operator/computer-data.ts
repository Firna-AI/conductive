export type ComputerScope =
  { kind: 'org'; orgId: string } | { kind: 'user'; userId: string }

export interface SuspensionComputer {
  sandboxId: string | null
  orgId: string
  purpose: 'workspace' | 'build' | 'retained'
  purposeId: string | null
  cleanupPending: number
  currentWorkspace: number
  unfinishedBuild: number
}

export async function suspensionComputers(
  db: D1Database,
  scope: ComputerScope,
): Promise<SuspensionComputer[]> {
  return (
    await db
      .prepare(
        `SELECT c.sandbox_id AS sandboxId, c.org_id AS orgId, c.purpose,
         c.purpose_id AS purposeId, c.cleanup_pending AS cleanupPending,
         EXISTS (SELECT 1 FROM workspaces w WHERE c.purpose = 'workspace'
           AND w.id = c.purpose_id AND w.org_id = c.org_id AND w.sandbox_id = c.sandbox_id) AS currentWorkspace,
         EXISTS (SELECT 1 FROM image_builds b JOIN image_build_jobs j ON j.build_id = b.id
           WHERE c.purpose = 'build' AND b.id = c.purpose_id AND b.org_id = c.org_id AND j.phase != 'done') AS unfinishedBuild
         FROM computer_ledger c WHERE c.deleted_at IS NULL AND c.create_rejected = 0
           AND ${scope.kind === 'org' ? 'c.org_id' : 'c.owner_user_id'} = ? ORDER BY c.id`,
      )
      .bind(scope.kind === 'org' ? scope.orgId : scope.userId)
      .all<SuspensionComputer>()
  ).results
}
