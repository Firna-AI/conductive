import { pictureType } from '../../files/page/file-view'
import type { FileEntry } from '../../shared/files'
import { splitLineTarget, type LineRange } from '../../shared/line-target'
import type { Mention } from '../../shared/mention-text'

/** An entry of the file tree that chat text names, with its lines. */
export interface FileTarget {
  entry: FileEntry
  /** The lines that the text names, for a file that shows as text. */
  lines: LineRange | null
}

/** Finds the entry of the file tree at a path: a folder or a file. */
export type EntryLookup = (
  path: string,
  folder: boolean,
) => FileEntry | undefined

/** The marks that can end a sentence right after a mention. */
const END_MARKS = new Set(['.', ',', ';', ':', '!', '?', ')'])

/**
 * The target of an entry with the lines of the text. A folder has no
 * lines, so a folder with lines names nothing. A picture shows no line
 * numbers, so its chip drops the lines.
 */
function targetOf(
  entry: FileEntry,
  lines: LineRange | null,
): FileTarget | null {
  if (!lines) return { entry, lines }
  if (entry.kind === 'directory') return null
  return { entry, lines: pictureType(entry.path) ? null : lines }
}

/** The entry at a path inside the repository, which can end with `/`. */
function entryAt(find: EntryLookup, path: string): FileEntry | undefined {
  if (path.endsWith('/')) {
    const folder = path.slice(0, -1)
    return folder === '' ? undefined : find(folder, true)
  }
  return path === '' ? undefined : (find(path, false) ?? find(path, true))
}

/**
 * The entry that a path with an optional line target names, or null. The
 * path is inside the repository, optionally after `./`, or absolute under
 * `root`, the folder of the repository.
 */
function pathTarget(
  text: string,
  find: EntryLookup,
  root: string | null,
): FileTarget | null {
  const { path, lines } = splitLineTarget(text)
  let inside: string
  if (path.startsWith('/')) {
    if (root === null || !path.startsWith(`${root}/`)) return null
    inside = path.slice(root.length + 1)
  } else inside = path.startsWith('./') ? path.slice(2) : path
  const entry = entryAt(find, inside)
  return entry ? targetOf(entry, lines) : null
}

/**
 * The entry that inline code of an answer names, or null. The whole code is
 * the path, with an optional line target, as `pathTarget` reads it. One
 * word with no `/`, no `.`, and no lines stays code, because such words
 * name ideas as often as top-level folders.
 */
export function codeTarget(
  code: string,
  find: EntryLookup,
  root: string | null,
): FileTarget | null {
  if (code.trim() !== code || /[\r\n]/u.test(code)) return null
  const { path, lines } = splitLineTarget(code)
  if (!lines && !/[./]/u.test(path)) return null
  return pathTarget(code, find, root)
}

/**
 * The entry that the target of a Markdown link of an answer names, or
 * null, such as `src/app.ts#L42` in `[the form](src/app.ts#L42)`. The
 * target can hold `%` escapes, such as `%20` for a space. A link names its
 * target on purpose, so one word counts too.
 */
export function fileLinkTarget(
  target: string,
  find: EntryLookup,
  root: string | null,
): FileTarget | null {
  let path: string
  try {
    path = decodeURI(target)
  } catch {
    return null
  }
  if (path === '' || /[\r\n]/u.test(path)) return null
  return pathTarget(path, find, root)
}

/** The entry of a mention as written, or with a line target at its end. */
function mentionedTarget(
  mention: Mention,
  find: EntryLookup,
): FileTarget | null {
  const exact = find(mention.path, mention.folder)
  if (exact) return { entry: exact, lines: null }
  if (mention.folder) return null
  const { path, lines } = splitLineTarget(mention.path)
  const entry = lines ? find(path, false) : undefined
  return entry ? targetOf(entry, lines) : null
}

/** The mention without the last character of its source. */
function shorter(mention: Mention): Mention | null {
  const source = mention.source.slice(0, -1)
  const full = source.slice(1)
  const folder = full.endsWith('/')
  const path = folder ? full.slice(0, -1) : full
  if (path === '') return null
  return { kind: 'mention', source, path, folder }
}

/** A mention that names an entry, and the end mark that follows it. */
export interface MentionMatch {
  target: FileTarget
  /** The source of the chip: the mention without the end mark. */
  source: string
  /** The end mark after the chip, which stays text, or ''. */
  rest: string
}

/**
 * The entry that a `@` mention names, also with a line target, as in
 * `@src/app.ts:42`. When the mention names nothing, a sentence can end
 * right after it, as in "See @src/app.ts." The reader then drops one end
 * mark and tries again, and the mark stays text after the chip.
 */
export function mentionTarget(
  mention: Mention,
  find: EntryLookup,
): MentionMatch | null {
  const target = mentionedTarget(mention, find)
  if (target) return { target, source: mention.source, rest: '' }
  const mark = mention.source.at(-1) ?? ''
  if (mention.source.endsWith('"') || !END_MARKS.has(mark)) return null
  const cut = shorter(mention)
  const found = cut ? mentionedTarget(cut, find) : null
  return cut && found ? { target: found, source: cut.source, rest: mark } : null
}
