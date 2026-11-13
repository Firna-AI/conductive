import {
  mentionEntries,
  repositoryFolder,
  type MentionEntry,
} from '../../fixtures/fileMentions'

/** A line or a range of lines at the end of a path, such as `:42-50`. */
export type LineTarget = { first: number; last?: number }

/** An entry of the tree that a path names, with its line target, if any. */
export type PathTarget = { entry: MentionEntry; line?: LineTarget }

/**
 * A line target at the end of a path: `:N`, `:N-M`, `:N:C`, `#LN`,
 * `#LN-LM`, or `#LNCC`. A column is ignored.
 */
const linePattern = /(?::(\d+)(?:-(\d+)|:\d+)?|#L(\d+)(?:-L(\d+)|C\d+)?)$/

/** A file that the file tab shows as a picture, not as text. */
const picturePattern = /\.(?:png|jpe?g|gif|webp)$/i

/** The path without its line target, and the line target. */
function splitLine(text: string): { path: string; line?: LineTarget } {
  const match = linePattern.exec(text)
  if (!match) return { path: text }
  const first = Number(match[1] ?? match[3])
  const last = match[2] ?? match[4]
  const line = last === undefined ? { first } : { first, last: Number(last) }
  return { path: text.slice(0, match.index), line }
}

/**
 * The path inside the repository: a relative path, with an optional `./`,
 * or an absolute path under the repository folder. A path in another
 * repository or outside the repository folder names nothing.
 */
function repositoryPath(path: string): string | undefined {
  if (!path.startsWith('/')) return path.replace(/^\.\//, '')
  const prefix = `${repositoryFolder}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : undefined
}

/**
 * The entry of the tree that a path names. A path that ends with `/` names
 * a folder. Without it, a mention names a file, and code names a file or a
 * folder.
 */
function treeEntry(path: string, mention: boolean): MentionEntry | undefined {
  const folder = path.endsWith('/')
  const key = folder ? path.slice(0, -1) : path
  const kindMatches = (entry: MentionEntry) =>
    folder ? entry.folder : !mention || !entry.folder
  return mentionEntries.find(
    (entry) => entry.path === key && kindMatches(entry),
  )
}

/**
 * The entry and the line target that a path names. A line target on a
 * folder names nothing. A line target on a picture is dropped, because the
 * file tab shows no lines for it.
 */
export function pathTarget(
  text: string,
  mention: boolean,
): PathTarget | undefined {
  const { path, line } = splitLine(text)
  const inside = repositoryPath(path)
  const entry = inside === undefined ? undefined : treeEntry(inside, mention)
  if (!entry) return undefined
  if (!line) return { entry }
  if (entry.folder) return undefined
  return picturePattern.test(entry.path) ? { entry } : { entry, line }
}

/**
 * The entry that inline code of an answer names, when the whole code is a
 * path of the tree with an optional line target. Code of one word without
 * a `/`, a `.`, or a line target stays code.
 */
export function codeTarget(code: string): PathTarget | undefined {
  const word = !/[/.]/.test(splitLine(code).path)
  if (word && !linePattern.test(code)) return undefined
  return pathTarget(code, false)
}

/** The line target as the name of a chip shows it: `:42` or `:42-50`. */
export function lineLabel(line: LineTarget | undefined): string {
  if (!line) return ''
  const { first, last } = line
  return last === undefined || last === first
    ? `:${first}`
    : `:${first}-${last}`
}
