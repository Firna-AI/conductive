import type { Git } from './git'
import { zeroPaths } from './git'

export interface GitEntry {
  mode: '100644' | '100755' | '120000' | '160000'
  oid: string
  stage: string
  path: string
}

export async function indexEntries(git: Git): Promise<GitEntry[]> {
  return zeroPaths(await git.run(['ls-files', '--stage', '-z'])).map(
    (record) => {
      const match =
        /^(100644|100755|120000|160000) ([a-f0-9]+) ([0-3])\t([\s\S]+)$/.exec(
          record,
        )
      if (!match) throw new Error('The repository index entry is invalid.')
      const mode = match[1]
      if (
        mode !== '100644' &&
        mode !== '100755' &&
        mode !== '120000' &&
        mode !== '160000'
      )
        throw new Error('The repository index mode is invalid.')
      return { mode, oid: match[2], stage: match[3], path: match[4] }
    },
  )
}

export function pathInput(paths: readonly string[]): Buffer {
  return Buffer.from(paths.map((path) => `${path}\0`).join(''))
}

export async function treeEntry(
  git: Git,
  sha: string,
  path: string,
): Promise<GitEntry | null> {
  const record = zeroPaths(
    await git.run(['ls-tree', '-z', sha, '--', path]),
  ).find((record) => record.slice(record.indexOf('\t') + 1) === path)
  if (!record) return null
  const match =
    /^(100644|100755|120000|160000) (?:blob|commit) ([a-f0-9]+)\t/.exec(record)
  if (!match) return null
  const mode = match[1]
  if (
    mode !== '100644' &&
    mode !== '100755' &&
    mode !== '120000' &&
    mode !== '160000'
  )
    return null
  return { mode, oid: match[2], stage: '0', path }
}
