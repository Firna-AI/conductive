import type { ReactNode } from 'react'
import type { FilePart } from '../../../../../src/chat/links/chat-parts'
import type { FileEntry } from '../../../../../src/shared/generated/FileEntry'
import {
  lineLabel,
  type LineRange,
} from '../../../../../src/shared/line-target'
import { shotViews } from '../../fixtures/answerFiles'
import type { MentionEntry } from '../../../../../src/ui/components/chat/mentionEntry'
import { CheckoutPicture, screenshotSize } from '../../fixtures/pictures'
import { paths } from '../../paths'
import inline from '../../../../../src/ui/components/common/InlineText.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { EntryIcon } from '../../../../../src/ui/components/files/fileIcons'
import { previewPaths } from '../files/previewPaths'
import {
  AnswerPicture,
  type PictureState,
} from '../../../../../src/ui/components/chat/AnswerPicture'
import { mockupEntry } from './chatReading'
import { useChatPictures, type PictureRead } from './chatPictures'
import { entryName } from '../../../../../src/ui/components/chat/entryPaths'
import { FileChip } from '../../../../../src/ui/components/chat/FileChip'

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

/** The line target as the name of a chip shows it: `:42`, `:42-50`, or ''. */
function linesLabel(lines: LineRange | null): string {
  return lines ? `:${lineLabel(lines)}` : ''
}

/**
 * The chip of a file or a folder of the tree, as the reader of the app
 * finds it. A line target adds `:42` or `:42-50` to its name and to its
 * title, and a press opens the file at the line.
 */
export function MentionChip(props: { part: FilePart }) {
  const { entry, lines, source } = props.part
  const mention = mockupEntry(entry)
  const label = linesLabel(lines)
  const to = lines ? linePage(mention) : filePage(mention)
  return (
    <FileChip
      entry={mention}
      icon={iconOf(mention)}
      mention={source}
      lines={label || undefined}
      name={entry.name}
      opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
      title={lines ? `${entry.path}${label}` : undefined}
    />
  )
}

/**
 * The page that a press on a link or a picture of a file opens, when the
 * mockups draw it, and its title: the path, with its lines.
 */
function linkOf(entry: FileEntry, lines: LineRange | null) {
  const mention = mockupEntry(entry)
  return {
    to: lines ? linePage(mention) : filePage(mention),
    title: `${entry.path}${linesLabel(lines)}`,
  }
}

/**
 * A Markdown link or image of an answer to a file of the tree: a normal
 * link with its label, which opens the file as its chip does, when the
 * mockups draw that page (answer chip decision 4).
 */
export function FileLinkText(props: {
  entry: FileEntry
  lines: LineRange | null
  children: ReactNode
}) {
  const { to, title } = linkOf(props.entry, props.lines)
  return to ? (
    <ScreenLink className={inline.link} title={title} to={to}>
      {props.children}
    </ScreenLink>
  ) : (
    <span className={inline.link} title={title}>
      {props.children}
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
 * which opens the file as its link does (screenshot decision 2). `label` is
 * its alternative text. While the reads of the chat run, the box of the
 * label shows. A chat that reads no picture, as while the cloud computer
 * does not run, shows the link.
 */
export function FilePicture(props: {
  entry: FileEntry
  lines: LineRange | null
  label: string
}) {
  const read = useChatPictures()
  const { label } = props
  const { to, title } = linkOf(props.entry, props.lines)
  return (
    <AnswerPicture
      label={label}
      opener={to ? (target) => <ScreenLink {...target} to={to} /> : undefined}
      state={pictureState(read, label, props.entry.path)}
      title={title}
    />
  )
}
