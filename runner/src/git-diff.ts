import { lstat } from 'node:fs/promises'
import { join, posix } from 'node:path'

import type { DiffResponse } from '../../src/shared/files'
import {
  FileAccessError,
  readBytes,
  readLinkBytes,
  safePath,
  textContent,
  unavailable,
} from './file-access'
import type { Git } from './git'
import { indexEntries, treeEntry, type GitEntry } from './git-entries'
import { updateWorkingIndex, withGitIndex } from './git-index'
import { changesFromIndex } from './repository-changes'

async function blob(git: Git, entry: GitEntry | null): Promise<Buffer | null> {
  if (!entry) return null
  if (entry.mode === '160000')
    return Buffer.from(`Subproject commit ${entry.oid}\n`)
  return git.run(['cat-file', 'blob', entry.oid])
}

export async function readGitDiff(
  source: Git,
  requestedPath: string,
  branch: string,
): Promise<DiffResponse> {
  safePath(requestedPath)
  const path = posix.normalize(requestedPath)
  const sha = await source.resolve(branch)
  return withGitIndex(
    source,
    async (index) => {
      if (index.unavailable.includes(path)) throw unavailable()
      const changes = await changesFromIndex(index, branch, sha)
      const oldPath =
        changes.files.find((file) => file.path === path)?.previousPath ?? path
      const previous = await blob(
        index.git,
        await treeEntry(index.git, sha, oldPath),
      )
      let physical: Awaited<ReturnType<typeof lstat>> | null = null
      try {
        physical = await lstat(join(source.root, path))
      } catch (error) {
        if (!(
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ))
          throw error
      }
      if (
        physical &&
        !physical.isFile() &&
        !physical.isSymbolicLink() &&
        !physical.isDirectory()
      )
        throw unavailable()
      // Read only the requested file. Checkpoints and counts never buffer its bytes.
      const bytes = physical?.isSymbolicLink()
        ? await readLinkBytes(source.root, path)
        : physical?.isFile()
          ? await readBytes(source.root, path, Number.MAX_SAFE_INTEGER)
          : null
      await updateWorkingIndex(
        index,
        index.paths.filter((item) => item === path || item === oldPath),
      )
      const currentEntry =
        (await indexEntries(index.git)).find(
          (entry) => entry.path === path && entry.stage === '0',
        ) ?? null
      if (physical?.isDirectory() && currentEntry?.mode !== '160000')
        throw unavailable()
      if (bytes !== null && currentEntry && currentEntry.mode !== '160000') {
        const oid = (
          await index.git.run(
            [
              'hash-object',
              '-w',
              ...(currentEntry.mode === '120000'
                ? ['--no-filters']
                : [`--path=${path}`]),
              '--stdin',
            ],
            { input: bytes },
          )
        )
          .toString()
          .trim()
        await index.git.run([
          'update-index',
          '--cacheinfo',
          `${currentEntry.mode},${oid},${path}`,
        ])
        currentEntry.oid = oid
      }
      let current = await blob(index.git, currentEntry)
      if (current === null && previous === null)
        throw new FileAccessError({
          code: 'file_not_found',
          message: 'The file does not exist.',
        })
      const patch = await index.git.run([
        'diff',
        ...(currentEntry?.mode === '160000' ? [] : ['--cached']),
        '--no-ext-diff',
        '--no-textconv',
        '--binary',
        '--find-renames',
        '--submodule=short',
        sha,
        '--',
        oldPath,
        ...(path === oldPath ? [] : [path]),
      ])
      if (
        currentEntry?.mode === '160000' &&
        patch
          .toString()
          .includes(`+Subproject commit ${currentEntry.oid}-dirty`)
      )
        current = Buffer.from(`Subproject commit ${currentEntry.oid}-dirty\n`)
      const oldContent = previous === null ? null : textContent(previous)
      const newContent = current === null ? null : textContent(current)
      return {
        path: requestedPath,
        baseBranch: branch,
        oldContent,
        newContent,
        patch: patch.toString(),
        binary:
          (previous !== null && oldContent === null) ||
          (current !== null && newContent === null),
      }
    },
    sha,
  )
}
