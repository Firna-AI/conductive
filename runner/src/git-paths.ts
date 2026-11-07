import { lstat } from 'node:fs/promises'
import { join, posix } from 'node:path'

import type { GitEntry } from './git-entries'

export type GitPathKind = 'absent' | 'file' | 'link' | 'directory' | 'special'
export type GitPathState =
  | { kind: 'absent'; entry: 'absent' }
  | { kind: 'file' | 'link'; entry: 'present' }
  | { kind: 'special'; entry: 'unavailable' }
  | { kind: 'directory'; entry: 'absent' | 'present'; submodule: boolean }

interface PathOptions {
  modes?: ReadonlyMap<string, GitEntry['mode']>
  submodules?: ReadonlySet<string>
  inspect?: (path: string) => Promise<GitPathKind>
}

async function inspectPath(path: string): Promise<GitPathKind> {
  const info = await lstat(path)
  if (info.isSymbolicLink()) return 'link'
  if (info.isDirectory()) return 'directory'
  if (info.isFile()) return 'file'
  return 'special'
}

/** One scan caches actual parent kinds without following directory links. */
export class GitPathClassifier {
  private readonly root: string
  private readonly options: PathOptions
  private readonly kinds = new Map<string, Promise<GitPathKind>>()

  constructor(root: string, options: PathOptions = {}) {
    this.root = root
    this.options = options
  }

  async classify(path: string): Promise<GitPathState> {
    path = posix.normalize(path)
    const kind = await this.kind(path)
    if (kind === 'absent') return { kind, entry: 'absent' }
    if (kind === 'special') return { kind, entry: 'unavailable' }
    if (kind === 'directory') {
      const submodule = this.options.submodules?.has(path) ?? false
      return {
        kind,
        entry:
          this.options.modes?.has(path) && !submodule ? 'absent' : 'present',
        submodule,
      }
    }
    return { kind, entry: 'present' }
  }

  private kind(path: string): Promise<GitPathKind> {
    if (path === '.') return Promise.resolve('directory')
    const cached = this.kinds.get(path)
    if (cached) return cached
    const pending = this.inspect(path)
    this.kinds.set(path, pending)
    return pending
  }

  private async inspect(path: string): Promise<GitPathKind> {
    const parent = posix.dirname(path)
    if (
      (await this.kind(parent)) !== 'directory' ||
      this.options.submodules?.has(parent)
    )
      return 'absent'
    try {
      return await (this.options.inspect ?? inspectPath)(join(this.root, path))
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error.code === 'ENOENT' || error.code === 'ENOTDIR')
      )
        return 'absent'
      throw error
    }
  }
}
