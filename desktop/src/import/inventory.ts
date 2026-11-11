import { lstat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { SourceFile, SourceInventory, SourceWorkspace } from './types.ts'
import type { ImportLocations } from './locations.ts'
import { LocalImportError } from './types.ts'
import { controlledWorktree, sourceGit, userExcludesFile } from './git.ts'
import { indexNativeFiles } from './native.ts'
import { selectedLfsPointers } from './inventory-lfs.ts'
import { localPrerequisiteCandidates } from './inventory-prerequisites.ts'
import { candidatePaths } from './candidate-paths.ts'
import {
  digest,
  fileIdentity,
  FILE_LIMIT_BYTES,
  missing,
  readSourceFile,
  readSourceLink,
  sourcePath,
  sourceRoot,
} from './safe-files.ts'

export const nativeRoots = ({ home }: ImportLocations) => [
  join(home, '.claude/projects'),
  join(home, '.codex/sessions'),
]

export async function inventory(
  workspace: SourceWorkspace,
  native: Map<string, string>,
  signal: AbortSignal,
  hashFiles: boolean,
  locations: ImportLocations,
): Promise<SourceInventory> {
  if (!workspace.path) throw new LocalImportError('source_missing')
  const root = await sourceRoot(workspace.path)
  const git = await sourceGit(root, signal)
  const headOid = (await git(['rev-parse', '--verify', 'HEAD'])).trim()
  const format = (await git(['rev-parse', '--show-object-format'])).trim()
  if (format !== 'sha1' && format !== 'sha256')
    throw new LocalImportError('read_failed')
  const branch =
    (
      await git(['symbolic-ref', '--quiet', '--short', 'HEAD'], {
        allowFailure: true,
      })
    ).trim() || workspace.row.branch
  if (!branch) throw new LocalImportError('read_failed')
  const commonDirectory = (
    await git(['rev-parse', '--path-format=absolute', '--git-common-dir'])
  ).trim()
  const index = resolve(
    root,
    (await git(['rev-parse', '--git-path', 'index'])).trim(),
  )
  const controlled = await controlledWorktree(
    root,
    commonDirectory,
    index,
    headOid,
    format,
    signal,
    !hashFiles,
  )
  const excludes = await userExcludesFile(root, locations, signal)
  let paths: Set<string>
  try {
    const changed = await controlled.run([
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      '--no-renames',
      '--ignore-submodules=all',
      '--name-only',
      '-z',
      headOid,
      '--',
    ])
    const known = new Set(
      (await git(['ls-tree', '-r', '-z', '--name-only', headOid])).split('\0'),
    )
    const added = (await git(['ls-files', '-z']))
      .split('\0')
      .filter((path) => path && !known.has(path))
    const untracked =
      (await git([
        '-c',
        `core.excludesFile=${excludes}`,
        'ls-files',
        '--others',
        '--exclude-standard',
        '-z',
      ])) + added.join('\0')
    paths = await candidatePaths(
      root,
      [...changed.split('\0'), ...untracked.split('\0')],
      excludes,
      controlled.ignoreIndex,
      locations,
      signal,
    )
  } finally {
    await controlled.dispose()
  }
  const files: SourceFile[] = []
  const leaves: string[] = []
  const lfs = hashFiles
    ? await selectedLfsPointers(git, headOid, paths)
    : new Map<string, NonNullable<SourceFile['lfs']>>()
  for (const path of [...paths])
    for (let parent = dirname(path); parent !== '.'; parent = dirname(parent))
      paths.add(parent)
  for (const path of [...paths].sort()) {
    signal.throwIfAborted()
    if (leaves.some((parent) => path.startsWith(`${parent}/`))) continue
    const full = sourcePath(root, path)
    const stat = await lstat(full, { bigint: true }).catch((error: unknown) => {
      if (missing(error)) return null
      throw error
    })
    if (!stat) {
      files.push({ path, kind: 'delete', mode: 0, size: 0, identity: '' })
      continue
    }
    const common = {
      path,
      mode: Number(stat.mode & 0o777n),
      size: Number(stat.size),
      identity: fileIdentity(stat),
    }
    if (stat.isSymbolicLink()) {
      leaves.push(path)
      files.push({
        ...common,
        kind: 'symlink',
        target: await readSourceLink(full),
      })
    } else if (stat.isDirectory()) files.push({ ...common, kind: 'directory' })
    else if (stat.isFile()) {
      leaves.push(path)
      files.push({
        ...common,
        kind: 'file',
        ...(lfs.has(path) ? { lfs: lfs.get(path) } : {}),
        ...(hashFiles &&
        (stat.size <= BigInt(FILE_LIMIT_BYTES) || lfs.has(path))
          ? {
              hash: (
                await readSourceFile(full, signal, undefined, common.identity)
              ).hash,
            }
          : {}),
      })
    } else throw new LocalImportError('read_failed')
  }
  const memories: SourceInventory['native'] = []
  for (const session of workspace.sessions) {
    const path =
      session.agent && session.nativeId
        ? (native.get(session.nativeId) ?? null)
        : null
    if (!path) {
      memories.push({ session, path: null, identity: null, hash: null })
      continue
    }
    const stat = await lstat(path, { bigint: true })
    if (!stat.isFile()) throw new LocalImportError('source_changed')
    memories.push({
      session,
      path,
      identity: fileIdentity(stat),
      hash: hashFiles ? (await readSourceFile(path, signal)).hash : null,
    })
  }
  const value: Omit<SourceInventory, 'digest' | 'prerequisiteCandidates'> = {
    workspace: { ...workspace, path: root },
    headOid,
    branch,
    objectFormat: format,
    commonDirectory,
    files,
    native: memories,
  }
  return {
    ...value,
    prerequisiteCandidates: hashFiles
      ? await localPrerequisiteCandidates(git, headOid, signal)
      : [],
    digest: digest(value),
  }
}

export async function sourceInventory(
  locations: ImportLocations,
  workspace: SourceWorkspace,
  signal: AbortSignal,
) {
  return inventory(
    workspace,
    await indexNativeFiles(nativeRoots(locations), signal),
    signal,
    true,
    locations,
  )
}
