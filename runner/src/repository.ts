import { lstat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import type {
  ChangesResponse,
  DiffResponse,
  FileEntry,
} from '../../src/shared/files'
import {
  FileAccessError,
  readBytes,
  readFileResponse,
  safePath,
  textContent,
} from './file-access'
import { branchChanges } from './repository-changes'
import { Git, zeroPaths } from './git'

export interface RepositorySnapshot {
  entries: FileEntry[]
  changes: ChangesResponse
}

export class Repository {
  readonly git: Git
  constructor(root: string) {
    this.git = new Git(root)
  }

  async snapshot(defaultBranch: string): Promise<RepositorySnapshot> {
    const changes = await this.changes(defaultBranch)
    const marks = new Map(changes.files.map((file) => [file.path, file.change]))
    const paths = zeroPaths(
      await this.git.run([
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '-z',
      ]),
    )
    const entries = new Map<string, FileEntry>()
    await Promise.all(
      paths.map(async (path) => {
        try {
          safePath(path)
          const info = await lstat(join(this.git.root, path))
          entries.set(path, {
            path,
            name: basename(path),
            kind: info.isDirectory() ? 'directory' : 'file',
            change: marks.get(path) ?? null,
          })
          for (
            let parent = dirname(path);
            parent !== '.';
            parent = dirname(parent)
          ) {
            entries.set(parent, {
              path: parent,
              name: basename(parent),
              kind: 'directory',
              change: null,
            })
          }
        } catch {
          /* Deleted and unavailable paths are absent from the full tree. */
        }
      }),
    )
    return {
      entries: [...entries.values()].sort((a, b) =>
        a.path.localeCompare(b.path, 'en'),
      ),
      changes,
    }
  }

  changes(defaultBranch: string): Promise<ChangesResponse> {
    return branchChanges(this.git, defaultBranch)
  }

  read(path: string, maxBytes: number) {
    return readFileResponse(this.git.root, path, maxBytes)
  }

  async diff(path: string, defaultBranch: string): Promise<DiffResponse> {
    safePath(path)
    const sha = await this.git.resolve(defaultBranch)
    const changes = await this.changes(defaultBranch)
    const change = changes.files.find((file) => file.path === path)
    const oldPath = change?.previousPath ?? path
    let previous: Buffer | null = null
    try {
      previous = await this.git.run(['show', `${sha}:${oldPath}`])
    } catch {
      /* An added file has no base blob. */
    }
    let current: Buffer | null = null
    try {
      current = await readBytes(this.git.root, path, Number.MAX_SAFE_INTEGER)
    } catch (error) {
      if (
        !(error instanceof FileAccessError) ||
        error.detail.code !== 'file_not_found'
      )
        throw error
    }
    if (current === null && previous === null)
      throw new FileAccessError({
        code: 'file_not_found',
        message: 'The file does not exist.',
      })
    const patch =
      change?.change === 'untracked'
        ? await this.git.run(
            [
              'diff',
              '--no-index',
              '--no-ext-diff',
              '--no-textconv',
              '--binary',
              '--',
              '/dev/null',
              path,
            ],
            true,
          )
        : await this.git.run([
            'diff',
            '--no-ext-diff',
            '--no-textconv',
            '--binary',
            '--find-renames',
            sha,
            '--',
            oldPath,
            ...(path === oldPath ? [] : [path]),
          ])
    const oldContent = previous === null ? null : textContent(previous)
    const newContent = current === null ? null : textContent(current)
    return {
      path,
      baseBranch: defaultBranch,
      oldContent,
      newContent,
      patch: patch.toString(),
      binary:
        (previous !== null && oldContent === null) ||
        (current !== null && newContent === null),
    }
  }
}
