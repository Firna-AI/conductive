import type { Workspace } from '../../src/shared/generated/Workspace'
import type { WorkspaceState } from '../../src/shared/generated/WorkspaceState'
import type { ArchivedComputerState } from '../../src/shared/generated/ArchivedComputerState'

export interface WorkspaceRow {
  id: string
  number: number
  orgId: string
  repositoryId: string
  sectionId: string
  parentId: string | null
  ownerUserId: string
  githubLogin: string
  displayName: string | null
  avatarUrl: string | null
  name: string | null
  branch: string
  baseBranch?: string | null
  /** The number of the current task. Each Continue adds 1. */
  taskNumber: number
  sandboxId: string | null
  providerAccount: string
  state: WorkspaceState
  github: Workspace['github']
  createdAt: number
  updatedAt: number
  archivedAt: number | null
  archivedComputerState: ArchivedComputerState | null
  stoppedAt: number | null
  nextDiskKeepaliveAt: number | null
  agent: Workspace['choice']['agent']
  model: string
  effort: Workspace['choice']['effort']
  fast: number
  sessionId: string
  firstTurnId: string
}
