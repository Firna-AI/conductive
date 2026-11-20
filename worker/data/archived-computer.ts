import type { ArchivedComputerState } from '../../src/shared/generated/ArchivedComputerState'
import type { Workspace } from '../../src/shared/generated/Workspace'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'

/** All attempts of this workspace count, including attempts in older accounts. */
export function archivedComputerColumn(table: 'w'): string {
  const scope = `c.org_id = ${table}.org_id AND c.purpose = 'workspace'
    AND c.purpose_id = ${table}.id`
  return `CASE
    WHEN ${table}.archived_at IS NULL THEN NULL
    WHEN ${table}.sandbox_id IS NOT NULL THEN 'may-exist'
    WHEN EXISTS (SELECT 1 FROM computer_ledger c WHERE ${scope}
      AND c.deleted_at IS NULL AND c.create_rejected = 0) THEN 'may-exist'
    WHEN EXISTS (SELECT 1 FROM computer_ledger c WHERE ${scope}
      AND c.sandbox_id IS NOT NULL AND c.deleted_at IS NOT NULL) THEN 'deleted'
    ELSE 'unknown' END AS archivedComputerState`
}

/** A missing Archive date supplies no computer outcome or original cutoff. */
export function archivedComputerFields(row: {
  archivedAt: number | null
  archivedComputerState: ArchivedComputerState | null
}): Pick<Workspace, 'archivedComputer'> {
  return row.archivedAt === null
    ? {}
    : {
        archivedComputer: {
          state: row.archivedComputerState ?? 'unknown',
          restoreUntil: row.archivedAt + WORKSPACE_RESTORE_MS,
        },
      }
}
