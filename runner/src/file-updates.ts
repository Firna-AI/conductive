import type { FileTreeChange, RunnerFileEvent } from '../../src/shared/files'
import type { RepositorySnapshot } from './repository'

export function treeUpdate(
  previous: RepositorySnapshot | null,
  current: RepositorySnapshot,
  revision: number,
  full: boolean,
): RunnerFileEvent | null {
  if (full || previous === null)
    return {
      type: 'files.snapshot',
      tree: { revision, partNumber: 1, partCount: 1, entries: current.entries },
    }
  const before = new Map(previous.entries.map((entry) => [entry.path, entry]))
  const after = new Map(current.entries.map((entry) => [entry.path, entry]))
  const changes: FileTreeChange[] = []
  for (const [path] of before)
    if (!after.has(path)) changes.push({ operation: 'remove', path })
  for (const [path, entry] of after) {
    if (
      JSON.stringify(before.get(path)) !== JSON.stringify(entry) ||
      previous.identities.get(path) !== current.identities.get(path) ||
      previous.readIdentities.get(path) !== current.readIdentities.get(path)
    )
      changes.push({ operation: 'upsert', entry })
  }
  return changes.length
    ? { type: 'files.changed', delta: { revision, changes } }
    : null
}

export function changesUpdated(
  previous: RepositorySnapshot | null,
  current: RepositorySnapshot,
): boolean {
  return (
    previous === null ||
    current.identities.size !== previous.identities.size ||
    [...current.identities].some(
      ([path, identity]) => previous.identities.get(path) !== identity,
    ) ||
    previous.baseCommit !== current.baseCommit ||
    JSON.stringify(previous.changes) !== JSON.stringify(current.changes)
  )
}
