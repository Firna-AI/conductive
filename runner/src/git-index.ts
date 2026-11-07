import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Git, zeroPaths } from './git'
import { indexEntries, pathInput, treeEntries } from './git-entries'
import { GitPathClassifier, type GitPathState } from './git-paths'

export interface TemporaryIndex {
  git: Git
  source: Git
  paths: readonly string[]
  untracked: readonly string[]
  unavailable: readonly string[]
  states: ReadonlyMap<string, GitPathState>
  classifier: GitPathClassifier
}

/** Only this temporary directory receives index writes and new blob objects. */
export async function withGitIndex<T>(
  source: Git,
  action: (index: TemporaryIndex) => Promise<T>,
  base?: string,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'conductive-git-'))
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
    const git = new Git(
      source.root,
      {
        GIT_INDEX_FILE: indexPath,
        GIT_OBJECT_DIRECTORY: join(directory, 'objects'),
        GIT_ALTERNATE_OBJECT_DIRECTORIES: JSON.stringify(
          objects.toString().replace(/\n$/, ''),
        ),
      },
      source.signal,
    )
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
    const [tracked, others, baseEntries] = await Promise.all([
      indexEntries(git),
      source.run(['ls-files', '--others', '--exclude-standard', '-z']),
      base ? treeEntries(source, base) : Promise.resolve([]),
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
    const modes = new Map(
      [...baseEntries, ...tracked].map((entry) => [entry.path, entry.mode]),
    )
    const classifier = new GitPathClassifier(source.root, {
      modes,
      submodules: new Set(
        tracked
          .filter((entry) => entry.mode === '160000')
          .map((entry) => entry.path),
      ),
    })
    const candidates = new Set([
      ...tracked.map((entry) => entry.path),
      ...untracked,
      ...baseEntries.map((entry) => entry.path),
    ])
    const states = new Map(
      await Promise.all(
        [...candidates].map(async (path): Promise<[string, GitPathState]> => [
          path,
          await classifier.classify(path),
        ]),
      ),
    )
    const paths = [...states]
      .filter(([, state]) => state.entry === 'present')
      .map(([path]) => path)
    const unavailable = [...states]
      .filter(([, state]) => state.entry === 'unavailable')
      .map(([path]) => path)
    const removed = [...states]
      .filter(([, state]) => state.entry !== 'present')
      .map(([path]) => path)
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
      states,
      classifier,
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
