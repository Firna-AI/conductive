import { copyFile, lstat, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Git, zeroPaths } from './git'
import { indexEntries, pathInput } from './git-entries'

export interface TemporaryIndex {
  git: Git
  source: Git
  paths: readonly string[]
  untracked: readonly string[]
  unavailable: readonly string[]
}

/** Only this temporary directory receives index writes and new blob objects. */
export async function withGitIndex<T>(
  source: Git,
  action: (index: TemporaryIndex) => Promise<T>,
  base?: string,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'conducting-git-'))
  try {
    const [original, objects] = await Promise.all([
      source.run([
        'rev-parse',
        '--path-format=absolute',
        '--git-path',
        'index',
      ]),
      source.run([
        'rev-parse',
        '--path-format=absolute',
        '--git-path',
        'objects',
      ]),
    ])
    const indexPath = join(directory, 'index')
    await mkdir(join(directory, 'objects'))
    const git = new Git(source.root, {
      GIT_INDEX_FILE: indexPath,
      GIT_OBJECT_DIRECTORY: join(directory, 'objects'),
      GIT_ALTERNATE_OBJECT_DIRECTORIES: JSON.stringify(
        objects.toString().replace(/\n$/, ''),
      ),
    })
    try {
      await copyFile(original.toString().replace(/\n$/, ''), indexPath)
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error
      await git.run(['read-tree', '--empty'])
    }
    await git.run(['update-index', '--no-split-index'])
    const [tracked, others, basePaths] = await Promise.all([
      indexEntries(git),
      source.run(['ls-files', '--others', '--exclude-standard', '-z']),
      base
        ? source.run(['ls-tree', '-r', '--name-only', '-z', base])
        : Promise.resolve(Buffer.alloc(0)),
    ])
    // A copied index has a newer mtime. Clear copied stat data so it cannot
    // hide a same-size edit that Git would call racily clean in the real index.
    if (tracked.length)
      await git.run(['update-index', '-z', '--index-info'], {
        input: Buffer.from(
          tracked
            .map(
              (entry) =>
                `${entry.mode} ${entry.oid} ${entry.stage}\t${entry.path}\0`,
            )
            .join(''),
        ),
      })
    const untracked = zeroPaths(others)
    const modes = new Map(tracked.map((entry) => [entry.path, entry.mode]))
    const candidates = new Set([
      ...tracked.map((entry) => entry.path),
      ...untracked,
      ...zeroPaths(basePaths),
    ])
    const classified = await Promise.all(
      [...candidates].map(
        async (
          path,
        ): Promise<{
          path: string
          kind: 'supported' | 'directory' | 'unavailable'
        }> => {
          try {
            const info = await lstat(join(source.root, path))
            if (
              info.isDirectory() &&
              modes.has(path) &&
              modes.get(path) !== '160000'
            )
              return { path, kind: 'directory' }
            else if (
              info.isFile() ||
              info.isSymbolicLink() ||
              info.isDirectory()
            )
              return { path, kind: 'supported' }
            else return { path, kind: 'unavailable' }
          } catch (error) {
            if (!(
              error instanceof Error &&
              'code' in error &&
              error.code === 'ENOENT'
            ))
              throw error
            return { path, kind: 'supported' }
          }
        },
      ),
    )
    const paths = classified
      .filter((entry) => entry.kind === 'supported')
      .map((entry) => entry.path)
    const unavailable = classified
      .filter((entry) => entry.kind === 'unavailable')
      .map((entry) => entry.path)
    const removedDirectories = classified
      .filter((entry) => entry.kind === 'directory')
      .map((entry) => entry.path)
    const removed = [...unavailable, ...removedDirectories]
    if (removed.length)
      await git.run(['update-index', '--force-remove', '-z', '--stdin'], {
        input: pathInput(removed),
      })
    const supported = new Set(paths)
    return await action({
      git,
      source,
      paths,
      untracked: untracked.filter((path) => supported.has(path)),
      unavailable,
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

export async function updateWorkingIndex(
  index: TemporaryIndex,
  paths: readonly string[] = index.paths,
): Promise<void> {
  if (paths.length)
    await index.git.run(
      ['update-index', '--add', '--remove', '--info-only', '-z', '--stdin'],
      { input: pathInput(paths) },
    )
}

export async function addUntracked(index: TemporaryIndex): Promise<void> {
  if (index.untracked.length)
    await index.git.run(
      [
        'add',
        '--intent-to-add',
        '--pathspec-from-file=-',
        '--pathspec-file-nul',
      ],
      { input: pathInput(index.untracked) },
    )
}

export async function comparison(
  index: TemporaryIndex,
  sha: string,
  format: '--name-status' | '--numstat',
): Promise<Buffer> {
  const common = [
    'diff',
    '--no-ext-diff',
    '--no-textconv',
    '--find-renames',
    '-z',
    format,
  ]
  const current = await index.git.run(
    [
      ...common,
      sha,
      '--',
      ...(index.unavailable.length
        ? ['.', ...index.unavailable.map((path) => `:(exclude,literal)${path}`)]
        : []),
    ],
    { literalPathspecs: !index.unavailable.length },
  )
  const unavailable = index.unavailable.length
    ? await index.git.run([
        ...common,
        '--cached',
        sha,
        '--',
        ...index.unavailable,
      ])
    : Buffer.alloc(0)
  return Buffer.concat([current, unavailable])
}
