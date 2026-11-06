import type {
  BranchChangedFile,
  ChangeKind,
  ChangesResponse,
} from '../../src/shared/files'
import { readBytes, textContent } from './file-access'
import { Git, zeroPaths } from './git'

function kind(status: string): ChangeKind {
  if (status.startsWith('A')) return 'added'
  if (status.startsWith('D')) return 'deleted'
  if (status.startsWith('R')) return 'renamed'
  return 'modified'
}

function lineCounts(bytes: Buffer): { added: number; removed: number } {
  const text = textContent(bytes)
  return {
    added:
      text === null || text === ''
        ? 0
        : text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
    removed: 0,
  }
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
): Promise<ChangesResponse> {
  const sha = await git.resolve(branch)
  const [names, counts, status, untracked] = await Promise.all([
    git.run([
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      '--name-status',
      '-z',
      '--find-renames',
      sha,
      '--',
    ]),
    git.run([
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      '--numstat',
      '-z',
      '--find-renames',
      sha,
      '--',
    ]),
    git.run(['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    git.run(['ls-files', '--others', '--exclude-standard', '-z']),
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
      change: kind(status),
      ...(numbers.get(path) ?? { added: 0, removed: 0 }),
      uncommitted: dirty.has(path) || dirty.has(oldPath),
    })
  }
  for (const path of zeroPaths(untracked)) {
    let counts = { added: 0, removed: 0 }
    try {
      counts = lineCounts(
        await readBytes(git.root, path, Number.MAX_SAFE_INTEGER),
      )
    } catch {
      /* Symlinks stay visible but expose no target bytes. */
    }
    files.push({ path, change: 'untracked', ...counts, uncommitted: true })
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
