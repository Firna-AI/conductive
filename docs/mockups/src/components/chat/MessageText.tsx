import type { Attachment } from '../../fixtures/attachments'
import type { MentionEntry } from '../../fixtures/fileMentions'
import { paths } from '../../paths'
import inline from '../common/InlineText.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { EntryIcon } from '../files/fileIcons'
import { previewPaths } from '../files/previewPaths'
import { workspaceLabel } from '../workspaces/label'
import type { WorkspaceRow } from '../workspaces/sections'
import { useChatWorkspaces } from './chatWorkspaces'
import { FileChip } from './FileChip'
import { entryName } from './entryPaths'
import { SentFileChip } from './SentFileChip'
import { linkedWorkspace, textParts } from './workspaceLinks'
import { WorkspaceChip, type ChipWorkspace } from './WorkspaceChip'

/** What the chip of a workspace shows of its row in the list of the org. */
export function chipOf(row: WorkspaceRow): ChipWorkspace {
  return {
    label: workspaceLabel(row.workspace.number),
    name: row.workspace.name,
    status: row.status,
  }
}

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

/** The file tab of the copy of an attached file, when the mockups draw it. */
const attachedTabs = { picture: paths.attachmentOpen } as const

/**
 * The text of a sent message or an answer. Each part in backticks is code,
 * and each link to a workspace of the org is a chip that opens the
 * workspace, when the mockups draw its screen. A Markdown link to a
 * workspace shows as the chip alone. Other links stay plain text, and so
 * does a link in code. In the text of a member, `mentions` makes each
 * mention of a file or a folder of the tree a chip that opens the file.
 *
 * `files` are the attached files of a sent message. A mention of the copy
 * path of one of them shows as the chip of that file, which opens the file
 * tab of the copy. While the message `waits` for the cloud computer, its
 * copies do not exist yet, so the chip of a file opens nothing.
 */
export function MessageText(props: {
  text: string
  mentions?: boolean
  files?: readonly Attachment[]
  waits?: boolean
}) {
  const rows = useChatWorkspaces()
  const parts = textParts(props.text, true, props.mentions, props.files)
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === 'text') return part.text
        if (part.kind === 'code') {
          return (
            <code className={inline.code} key={index}>
              {part.text}
            </code>
          )
        }
        if (part.kind === 'attached') {
          const tab = props.waits === true ? undefined : part.file.tab
          const to = tab ? attachedTabs[tab] : undefined
          return (
            <SentFileChip
              file={part.file}
              key={index}
              mention={part.source}
              opener={
                to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined
              }
            />
          )
        }
        if (part.kind === 'mention') {
          const to = filePage(part.entry)
          return (
            <FileChip
              entry={part.entry}
              icon={iconOf(part.entry)}
              key={index}
              mention={part.source}
              opener={
                to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined
              }
            />
          )
        }
        const row = linkedWorkspace(part.href, rows)
        if (!row) return part.source
        const to = row.to
        return (
          <WorkspaceChip
            key={index}
            opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
            workspace={chipOf(row)}
          />
        )
      })}
    </>
  )
}

/**
 * The files of a sent message that its text does not show, such as the
 * files of a message from before files had a place in the text. They show
 * under the message.
 */
export function filesWithoutPlace(
  text: string,
  files: readonly Attachment[],
): Attachment[] {
  const placed = new Set(
    textParts(text, true, true, files).flatMap((part) =>
      part.kind === 'attached' ? [part.file.id] : [],
    ),
  )
  return files.filter((file) => !placed.has(file.id))
}
