import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

import type { ChangedFile } from '../../src/shared/files'
import { Git } from './git'
import { indexEntries } from './git-entries'
import { updateWorkingIndex, withGitIndex } from './git-index'
import type { Repository } from './repository'

export type Checkpoint = Map<string, string>

export async function checkpoint(repository: Repository): Promise<Checkpoint> {
  return gitCheckpoint(repository.git)
}

async function gitCheckpoint(source: Git): Promise<Checkpoint> {
  return withGitIndex(source, async (index) => {
    await updateWorkingIndex(index)
    const result: Checkpoint = new Map()
    for (const entry of await indexEntries(index.git)) {
      let state = `${entry.mode} ${entry.oid} ${entry.stage}`
      if (entry.mode === '160000') {
        const child = new Git(join(source.root, entry.path))
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
          /* An uninitialized submodule retains its recorded commit. */
        }
      }
      result.set(entry.path, `${result.get(entry.path) ?? ''}${state}\n`)
    }
    return result
  })
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
  return [...paths]
    .filter((path) => before.get(path) !== after.get(path))
    .map((path) => {
      const file = changes.files.find((file) => file.path === path)
      if (file)
        return {
          path: file.path,
          ...(file.previousPath ? { previousPath: file.previousPath } : {}),
          change: file.change,
          added: file.added,
          removed: file.removed,
        }
      return {
        path,
        change: !after.has(path)
          ? 'deleted'
          : !before.has(path)
            ? 'added'
            : 'modified',
        added: 0,
        removed: 0,
      }
    })
}
