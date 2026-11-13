import {
  codeTarget as appCodeTarget,
  fileLinkTarget,
  mentionTarget,
  type EntryLookup,
  type FileTarget,
} from '../../../../../src/chat/links/file-targets'
import type { FileEntry } from '../../../../../src/shared/files'
import {
  lineLabel as appLineLabel,
  type LineRange,
} from '../../../../../src/shared/line-target'
import {
  mentionEntries,
  repositoryFolder,
  type MentionEntry,
} from '../../fixtures/fileMentions'
import { entryName } from './entryPaths'

/** A line or a range of lines at the end of a path, such as `:42-50`. */
export type LineTarget = LineRange

/** An entry of the tree that a path names, with its line target, if any. */
export type PathTarget = { entry: MentionEntry; line?: LineTarget }

/**
 * The tree of the mockups as the app reads it, so the mockups read paths
 * with the rules of the app: the line targets, the folders, and the
 * pictures that drop their lines.
 */
const tree: ReadonlyMap<string, { file: FileEntry; entry: MentionEntry }> =
  new Map(
    mentionEntries.map((entry) => [
      `${entry.folder ? 'folder' : 'file'}:${entry.path}`,
      {
        entry,
        file: {
          path: entry.path,
          name: entryName(entry),
          kind: entry.folder ? 'directory' : 'file',
          change: null,
        },
      },
    ]),
  )

const find: EntryLookup = (path, folder) =>
  tree.get(`${folder ? 'folder' : 'file'}:${path}`)?.file

/** The entry of the mockups that a target of the app names. */
function pathTargetOf(target: FileTarget | null): PathTarget | undefined {
  if (!target) return undefined
  const folder = target.entry.kind === 'directory'
  const found = tree.get(`${folder ? 'folder' : 'file'}:${target.entry.path}`)
  if (!found) return undefined
  return target.lines
    ? { entry: found.entry, line: target.lines }
    : { entry: found.entry }
}

/**
 * The entry and the line target that the path of a mention names, as the
 * app reads a mention: a path inside the repository, and a folder that
 * ends with `/`.
 */
export function pathTarget(path: string): PathTarget | undefined {
  const folder = path.endsWith('/')
  const inside = folder ? path.slice(0, -1) : path
  if (inside === '') return undefined
  const mention = {
    kind: 'mention' as const,
    source: `@${path}`,
    path: inside,
    folder,
  }
  const match = mentionTarget(mention, find)
  return match && match.rest === '' ? pathTargetOf(match.target) : undefined
}

/**
 * The entry that inline code of an answer names, as the app reads it: the
 * whole code is a path of the tree, inside the repository or under its
 * folder, with an optional line target.
 */
export function codeTarget(code: string): PathTarget | undefined {
  return pathTargetOf(appCodeTarget(code, find, repositoryFolder))
}

/**
 * The entry that the target of a Markdown link or image of an answer
 * names, as the app reads it (answer chip decision 4).
 */
export function linkTarget(target: string): PathTarget | undefined {
  return pathTargetOf(fileLinkTarget(target, find, repositoryFolder))
}

/** The line target as the name of a chip shows it: `:42` or `:42-50`. */
export function lineLabel(line: LineTarget | undefined): string {
  return line ? `:${appLineLabel(line)}` : ''
}
