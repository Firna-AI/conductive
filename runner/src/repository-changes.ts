import type {
  BranchChangedFile,
  ChangeKind,
  ChangesResponse,
} from '../../src/shared/files'
import { Git, zeroPaths } from './git'
import {
  addUntracked,
  comparison,
  withGitIndex,
  type TemporaryIndex,
} from './git-index'

function kind(status: string): ChangeKind {
  if (status.startsWith('A')) return 'added'
  if (status.startsWith('D')) return 'deleted'
  if (status.startsWith('R')) return 'renamed'
  return 'modified'
}

function stats(bytes: Buffer): Map<string, { added: number; removed: number }> {
  const records = zeroPaths(bytes)
  const result = new Map<string, { added: number; removed: number }>()
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const first = record.indexOf('\t')
    const second = record.indexOf('\t', first + 1)
    if (first < 0 || second < 0)
      throw new Error('The repository line counts are invalid.')
    let path = record.slice(second + 1)
    if (!path) {
      i++
      path = records[++i]
    }
    if (path === undefined) throw new Error('The repository rename is invalid.')
    result.set(path, {
      added: Number(record.slice(0, first)) || 0,
      removed: Number(record.slice(first + 1, second)) || 0,
    })
  }
  return result
}

export async function branchChanges(
  git: Git,
  branch: string,
  warn: (message: string) => void = () => {},
): Promise<ChangesResponse> {
  const sha = await git.resolve(branch)
  return withGitIndex(
    git,
    async (index) => {
      if (index.unavailable.length)
        warn('Some repository files cannot be stored by Git.')
      return changesFromIndex(index, branch, sha)
    },
    sha,
  )
}

export async function changesFromIndex(
  index: TemporaryIndex,
  branch: string,
  sha: string,
): Promise<ChangesResponse> {
  await addUntracked(index)
  const [names, counts, status] = await Promise.all([
    comparison(index, sha, '--name-status'),
    comparison(index, sha, '--numstat'),
    index.source.run([
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
    ]),
  ])
  const dirty = new Set<string>()
  const statuses = zeroPaths(status)
  for (let i = 0; i < statuses.length; i++) {
    const item = statuses[i]
    dirty.add(item.slice(3))
    if (item.slice(0, 2).includes('R') || item.slice(0, 2).includes('C'))
      dirty.add(statuses[++i])
  }
  const numbers = stats(counts)
  const untracked = new Set(index.untracked)
  const records = zeroPaths(names)
  const files: BranchChangedFile[] = []
  for (let i = 0; i < records.length; i++) {
    const status = records[i]
    const oldPath = records[++i]
    const renamed = status.startsWith('R') || status.startsWith('C')
    const path = renamed ? records[++i] : oldPath
    if (path === undefined) throw new Error('The repository paths are invalid.')
    files.push({
      path,
      ...(renamed ? { previousPath: oldPath } : {}),
      change:
        untracked.has(path) && status.startsWith('A')
          ? 'untracked'
          : kind(status),
      ...(numbers.get(path) ?? { added: 0, removed: 0 }),
      uncommitted: dirty.has(path) || dirty.has(oldPath),
    })
  }
  files.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  return {
    baseBranch: branch,
    files,
    summary: {
      files: files.length,
      added: files.reduce((sum, file) => sum + file.added, 0),
      removed: files.reduce((sum, file) => sum + file.removed, 0),
    },
  }
}
