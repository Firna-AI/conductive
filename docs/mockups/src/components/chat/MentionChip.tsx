import { shotViews } from '../../fixtures/answerFiles'
import type { MentionEntry } from '../../fixtures/fileMentions'
import { CheckoutPicture, screenshotSize } from '../../fixtures/pictures'
import { paths } from '../../paths'
import inline from '../common/InlineText.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { EntryIcon } from '../files/fileIcons'
import { previewPaths } from '../files/previewPaths'
import { AnswerPicture, type PictureState } from './AnswerPicture'
import { lineLabel } from './answerPaths'
import { useChatPictures, type PictureRead } from './chatPictures'
import { entryName } from './entryPaths'
import { FileChip } from './FileChip'
import type { MentionPart } from './fileMentions'
import type { FileLinkPart } from './answerNodes'

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

/**
 * The page that a press on a link or a picture of a file opens, when the
 * mockups draw it, and its title: the path, with its lines.
 */
function linkOf(part: FileLinkPart) {
  const { entry, line } = part
  return {
    to: line ? linePage(entry) : filePage(entry),
    title: `${entry.path}${lineLabel(line)}`,
  }
}

/**
 * A Markdown link or image of an answer to a file of the tree: a normal
 * link with its label, which opens the file as its chip does, when the
 * mockups draw that page (answer chip decision 4).
 */
export function FileLinkText(props: { part: FileLinkPart }) {
  const { label } = props.part
  const { to, title } = linkOf(props.part)
  return to ? (
    <ScreenLink className={inline.link} title={title} to={to}>
      {label}
    </ScreenLink>
  ) : (
    <span className={inline.link} title={title}>
      {label}
    </span>
  )
}

/**
 * What the picture of `path` shows for the reads of the chat. The picture
 * files of the tree are the screenshots of the agent, which the mockups
 * draw. A picture file without a drawing shows its link.
 */
function pictureState(
  read: PictureRead | undefined,
  label: string,
  path: string,
): PictureState {
  const view = shotViews[path]
  if (read === undefined || view === undefined) return { kind: 'link' }
  if (read === 'loading') return { kind: 'loading' }
  const picture = <CheckoutPicture label={label} view={view} />
  return { kind: 'picture', size: screenshotSize, picture }
}

/**
 * A Markdown image of an answer to a picture file of the tree: its picture,
 * which opens the file as its link does (screenshot decision 2). While the
 * reads of the chat run, the box of the label shows. A chat that reads no
 * picture, as while the cloud computer does not run, shows the link.
 */
export function FilePicture(props: { part: FileLinkPart }) {
  const read = useChatPictures()
  const { label } = props.part
  const { to, title } = linkOf(props.part)
  return (
    <AnswerPicture
      label={label}
      opener={to ? (target) => <ScreenLink {...target} to={to} /> : undefined}
      state={pictureState(read, label, props.part.entry.path)}
      title={title}
    />
  )
}
