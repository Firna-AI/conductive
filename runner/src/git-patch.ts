import { FILE_READ_MAX_BYTES } from '../../src/shared/files'
import type { Git } from './git'
import type { GitEntry } from './git-entries'

/** A one-entry old tree keeps replacement-directory children out of a file diff. */
async function entryTree(git: Git, entry: GitEntry | null): Promise<string> {
  if (!entry)
    return (
      await git.run(['mktree', '-z', '--missing'], { input: Buffer.alloc(0) })
    )
      .toString()
      .trim()
  let mode: GitEntry['mode'] | '040000' = entry.mode
  let type: 'blob' | 'commit' | 'tree' = mode === '160000' ? 'commit' : 'blob'
  let oid = entry.oid
  for (const name of entry.path.split('/').reverse()) {
    oid = (
      await git.run(['mktree', '-z', '--missing'], {
        input: Buffer.from(`${mode} ${type} ${oid}\t${name}\0`),
      })
    )
      .toString()
      .trim()
    mode = '040000'
    type = 'tree'
  }
  return oid
}

export async function entryPatch(
  git: Git,
  previous: GitEntry | null,
  current: GitEntry | null,
): Promise<Buffer> {
  const oldTree = await entryTree(git, previous)
  await git.run(['read-tree', '--empty'])
  if (current)
    await git.run([
      'update-index',
      '--add',
      '--cacheinfo',
      `${current.mode},${current.oid},${current.path}`,
    ])
  const paths = new Set([
    ...(previous ? [previous.path] : []),
    ...(current ? [current.path] : []),
  ])
  return git.run(
    [
      'diff',
      ...(current?.mode === '160000' ? [] : ['--cached']),
      '--no-ext-diff',
      '--no-textconv',
      '--binary',
      '--find-renames',
      '--submodule=short',
      oldTree,
      '--',
      ...paths,
    ],
    { maxBytes: FILE_READ_MAX_BYTES },
  )
}
