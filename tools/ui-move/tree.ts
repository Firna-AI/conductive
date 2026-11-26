// The file tree of the move: the tracked files, the path map, and the
// resolution of a relative path in the tree before or after the move.
import path from 'node:path'

export type PathMap = Record<string, string>

/** The suffixes that a module specifier can leave out. */
const SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.css',
  '/index.ts',
  '/index.tsx',
  '/index.js',
]

export type Target = {
  /** The file or folder that the path names, in the tree before the move. */
  path: string
  /** The text that the specifier leaves out, such as `.ts` or `/index.ts`. */
  suffix: string
  /** The specifier names a `.ts` or `.tsx` file with a `.js` ending. */
  jsEnding: boolean
}

export class Tree {
  readonly files: Set<string>
  readonly map: PathMap
  readonly inverse: PathMap
  readonly folders: Set<string>
  readonly folderMap: PathMap

  /** The entries whose old and new paths both hold a file. */
  readonly collisions: [string, string][]

  /**
   * `files` are the repository paths on disk, with `/` separators. An entry
   * of the map applies only when its old file is gone, so a path that names
   * its old place leads to its new place. When both paths hold a file, the
   * entry does not apply and lands in `collisions`: the old path then keeps
   * naming its own file.
   */
  constructor(files: Iterable<string>, map: PathMap) {
    this.files = new Set(files)
    this.collisions = []
    const active: PathMap = {}
    for (const [from, to] of Object.entries(map)) {
      if (!this.files.has(from)) active[from] = to
      else if (this.files.has(to)) this.collisions.push([from, to])
    }
    this.map = active
    this.inverse = Object.fromEntries(
      Object.entries(active).map(([from, to]) => [to, from]),
    )
    for (const [from, to] of Object.entries(active)) {
      if (this.files.has(to)) this.files.add(from)
    }
    this.folders = new Set()
    for (const file of this.files) {
      let folder = path.posix.dirname(file)
      while (folder !== '.' && !this.folders.has(folder)) {
        this.folders.add(folder)
        folder = path.posix.dirname(folder)
      }
    }
    this.folderMap = movedFolders(this.files, active)
  }

  /** The path of a file after the move. */
  newPath(file: string): string {
    return this.map[file] ?? this.folderMap[file] ?? file
  }

  /** The path of a file before the move. */
  oldPath(file: string): string {
    return this.inverse[file] ?? file
  }

  /** A moved path, an old path of the map, or a fully moved folder. */
  moves(file: string): boolean {
    return file in this.map || file in this.folderMap
  }

  /** Finds the file or folder that `relative` names from `folder`. */
  resolve(folder: string, relative: string): Target | undefined {
    const base = path.posix.normalize(path.posix.join(folder, relative))
    if (base.startsWith('..')) return undefined
    const trimmed = base.replace(/\/$/, '')
    for (const suffix of SUFFIXES) {
      if (this.files.has(trimmed + suffix))
        return { path: trimmed + suffix, suffix, jsEnding: false }
    }
    if (/\.js$/.test(trimmed)) {
      const stem = trimmed.slice(0, -3)
      for (const ending of ['.ts', '.tsx']) {
        if (this.files.has(stem + ending))
          return { path: stem + ending, suffix: '', jsEnding: true }
      }
    }
    if (this.folders.has(trimmed))
      return { path: trimmed, suffix: '', jsEnding: false }
    return undefined
  }

  /** The new form of `relative`, written from the new place of `file`. */
  rewrite(file: string, relative: string): string | undefined {
    const [bare, rest] = splitQuery(relative)
    const moved = file in this.inverse || file in this.map
    const before = path.posix.dirname(this.oldPath(file))
    const after = path.posix.dirname(this.newPath(file))
    const target =
      this.resolve(before, bare) ??
      (before === after ? undefined : this.resolve(after, bare))
    if (!target) return undefined
    if (!moved && !this.moves(target.path)) return undefined
    const to = this.newPath(target.path)
    const base = target.jsEnding
      ? to.replace(/\.tsx?$/, '.js')
      : to.slice(0, to.length - target.suffix.length)
    let next = path.posix.relative(after, base) || '.'
    if (!next.startsWith('.')) next = `./${next}`
    if (bare.endsWith('/') && !next.endsWith('/')) next += '/'
    const result = next + rest
    return result === relative ? undefined : result
  }
}

function splitQuery(relative: string): [string, string] {
  const at = relative.search(/[?#]/)
  return at < 0 ? [relative, ''] : [relative.slice(0, at), relative.slice(at)]
}

/** The folders whose every file moves to one new folder. */
function movedFolders(files: Set<string>, map: PathMap): PathMap {
  const newPaths = new Set(Object.values(map))
  const candidates = new Map<string, string>()
  for (const [from, to] of Object.entries(map)) {
    let a = path.posix.dirname(from)
    let b = path.posix.dirname(to)
    while (a !== '.' && path.posix.basename(a) === path.posix.basename(b)) {
      candidates.set(a, b)
      a = path.posix.dirname(a)
      b = path.posix.dirname(b)
    }
  }
  const result: PathMap = {}
  for (const [folder, to] of candidates) {
    const inside = [...files].filter(
      (file) => file.startsWith(`${folder}/`) && !newPaths.has(file),
    )
    if (inside.length > 0 && inside.every((file) => map[file] !== undefined))
      result[folder] = to
  }
  return result
}
