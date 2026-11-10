import type { OperatorSuspension } from '../../src/shared/operator'

export interface SuspensionRow {
  suspendedAt: number | null
  operatorGithubId: number | null
  operatorLogin: string | null
}

export function suspensionNote(row: SuspensionRow): OperatorSuspension | null {
  if (row.suspendedAt === null) return null
  return {
    suspendedAt: row.suspendedAt,
    operator:
      row.operatorGithubId !== null && row.operatorLogin !== null
        ? { githubId: row.operatorGithubId, login: row.operatorLogin }
        : null,
  }
}
