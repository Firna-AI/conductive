import { createHash } from 'node:crypto'

import type { ChangedFile } from '../../src/shared/files'
import { readBytes } from './file-access'
import { zeroPaths } from './git'
import type { Repository } from './repository'

export type Checkpoint = Map<string, string>

export async function checkpoint(repository: Repository): Promise<Checkpoint> {
  const paths = zeroPaths(
    await repository.git.run([
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
    ]),
  )
  const entries = await Promise.all(
    paths.map(async (path): Promise<[string, string] | null> => {
      try {
        const content = await readBytes(
          repository.git.root,
          path,
          Number.MAX_SAFE_INTEGER,
        )
        return [path, createHash('sha256').update(content).digest('hex')]
      } catch {
        return null
      }
    }),
  )
  return new Map(entries.filter((entry) => entry !== null))
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
