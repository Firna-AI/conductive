import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

import type { ChangedFile } from '../../src/shared/files'
import { Git } from './git'
import { indexEntries } from './git-entries'
import {
  updateWorkingIndex,
  withGitIndex,
  type TemporaryIndex,
} from './git-index'
import type { Repository } from './repository'

export type Checkpoint = Map<string, string>

export async function checkpoint(repository: Repository): Promise<Checkpoint> {
  return gitCheckpoint(repository.git)
}

async function gitCheckpoint(source: Git): Promise<Checkpoint> {
  return withGitIndex(source, checkpointFromIndex)
}

/** Captures Git identities from the report's existing temporary index. */
export async function checkpointFromIndex(
  index: TemporaryIndex,
): Promise<Checkpoint> {
  await updateWorkingIndex(index)
  const result: Checkpoint = new Map()
  for (const entry of await indexEntries(index.git)) {
    let state = `${entry.mode} ${entry.oid} ${entry.stage}`
    if (entry.mode === '160000') {
      const child = new Git(
        join(index.source.root, entry.path),
        {},
        index.source.signal,
      )
      try {
        const top = (await child.run(['rev-parse', '--show-toplevel']))
          .toString()
          .replace(/\n$/, '')
        if (resolve(top) === resolve(child.root)) {
          const files = await gitCheckpoint(child)
          state += ` ${createHash('sha256')
            .update(JSON.stringify([...files]))
            .digest('hex')}`
        }
      } catch {
        index.source.signal?.throwIfAborted()
        /* An uninitialized submodule retains its recorded commit. */
      }
    }
    result.set(entry.path, `${result.get(entry.path) ?? ''}${state}\n`)
  }
  return result
}

export async function changedSince(
  repository: Repository,
  branch: string,
  before: Checkpoint,
): Promise<ChangedFile[]> {
  const [after, changes] = await Promise.all([
    checkpoint(repository),
    repository.changes(branch),
  ])
  const paths = new Set([...before.keys(), ...after.keys()])
  const identities = new Map(changes.files.map((file) => [file.path, file]))
  for (const file of changes.files) {
    if (
      file.change === 'renamed' &&
      file.previousPath &&
      !identities.has(file.previousPath)
    )
      identities.set(file.previousPath, file)
  }
  const emitted = new Set<(typeof changes.files)[number]>()
  const result: ChangedFile[] = []
  for (const path of paths) {
    if (before.get(path) === after.get(path)) continue
    const file = identities.get(path)
    if (file) {
      if (emitted.has(file)) continue
      emitted.add(file)
      result.push({
        path: file.path,
        ...(file.previousPath ? { previousPath: file.previousPath } : {}),
        change: file.change,
        added: file.added,
        removed: file.removed,
      })
    } else
      result.push({
        path,
        change: !after.has(path)
          ? 'deleted'
          : !before.has(path)
            ? 'added'
            : 'modified',
        added: 0,
        removed: 0,
      })
  }
  return result
}
