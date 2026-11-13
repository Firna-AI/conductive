import type { MentionEntry } from '../../fixtures/fileMentions'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { EntryIcon } from '../files/fileIcons'
import { previewPaths } from '../files/previewPaths'
import { lineLabel } from './answerPaths'
import { entryName } from './entryPaths'
import { FileChip } from './FileChip'
import type { MentionPart } from './fileMentions'

/** The icon of an entry, as the All files of the mockups draws it. */
export function iconOf(entry: MentionEntry) {
  return <EntryIcon folder={entry.folder} name={entryName(entry)} size={12} />
}

/**
 * The page that a press on a file chip opens, when the mockups draw it: the
 * tab of the file, as a press in All files opens it. A press on a folder
 * chip shows All files with the folder open, which no view draws.
 */
function filePage(entry: MentionEntry): string | undefined {
  return entry.preview ? previewPaths[entry.preview] : undefined
}

/**
 * The page that a press on a file chip with a line target opens, when the
 * mockups draw it: the file tab in source mode, with the lines in view and
 * marked.
 */
function linePage(entry: MentionEntry): string | undefined {
  return entry.preview === 'code' ? paths.codeAtLine : undefined
}

/**
 * The chip of a file or a folder of the tree. A line target adds `:42` or
 * `:42-50` to its name and to its title, and a press opens the file at the
 * line.
 */
export function MentionChip(props: { part: MentionPart }) {
  const { entry, line, source } = props.part
  const label = lineLabel(line)
  const to = line ? linePage(entry) : filePage(entry)
  return (
    <FileChip
      entry={entry}
      icon={iconOf(entry)}
      mention={source}
      lines={label || undefined}
      name={entryName(entry)}
      opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
      title={line ? `${entry.path}${label}` : undefined}
    />
  )
}
