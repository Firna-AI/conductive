import { posix } from 'node:path'

import { FILE_READ_MAX_BYTES, type DiffResponse } from '../../src/shared/files'
import {
  FileAccessError,
  fileTooLarge,
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
import { entryPatch } from './git-patch'
import { integer } from './parse'

async function blob(git: Git, entry: GitEntry | null): Promise<Buffer | null> {
  if (!entry) return null
  if (entry.mode === '160000')
    return Buffer.from(`Subproject commit ${entry.oid}\n`)
  const size = integer(
    Number((await git.run(['cat-file', '-s', entry.oid])).toString().trim()),
  )
  if (size > FILE_READ_MAX_BYTES) throw fileTooLarge(size, FILE_READ_MAX_BYTES)
  return git.run(['cat-file', 'blob', entry.oid], {
    maxBytes: FILE_READ_MAX_BYTES,
  })
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
      const previousEntry = await treeEntry(index.git, sha, oldPath)
      const previous = await blob(index.git, previousEntry)
      const physical =
        index.states.get(path) ?? (await index.classifier.classify(path))
      if (physical.entry === 'unavailable') throw unavailable()
      // Read only the requested file. Checkpoints and counts never buffer its bytes.
      const bytes =
        physical.kind === 'link'
          ? await readLinkBytes(source.root, path)
          : physical.kind === 'file'
            ? await readBytes(source.root, path, FILE_READ_MAX_BYTES)
            : null
      await updateWorkingIndex(
        index,
        index.paths.filter((item) => item === path || item === oldPath),
      )
      const currentEntry =
        (await indexEntries(index.git)).find(
          (entry) => entry.path === path && entry.stage === '0',
        ) ?? null
      if (
        physical.kind === 'directory' &&
        physical.entry === 'present' &&
        currentEntry?.mode !== '160000'
      )
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
      const patch = await entryPatch(index.git, previousEntry, currentEntry)
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
