import type { BranchChangedFile } from '../../src/shared/generated/BranchChangedFile'
import type { ChangesDelta } from '../../src/shared/generated/ChangesDelta'
import type { RunnerChangesPart } from '../../src/shared/generated/RunnerChangesPart'

export function changedRow(
  path: string,
  added = 1,
  removed = 0,
): BranchChangedFile {
  return { path, change: 'modified', added, removed, uncommitted: true }
}

export function changesDelta(patch: Partial<ChangesDelta> = {}) {
  const delta: ChangesDelta = {
    revision: 2,
    baseBranch: 'main',
    summary: { files: 1, added: 1, removed: 0 },
    omitted: { files: 0, added: 0, removed: 0 },
    removes: [],
    upserts: [],
    ...patch,
  }
  return { type: 'changes.changed' as const, delta }
}

export function fullChanges(patch: Partial<RunnerChangesPart> = {}) {
  const changes: RunnerChangesPart = {
    revision: 1,
    partCount: 1,
    partNumber: 1,
    baseBranch: 'main',
    files: [changedRow('file.txt')],
    summary: { files: 1, added: 1, removed: 0 },
    ...patch,
  }
  return { type: 'changes.updated' as const, changes }
}
