import { Fragment, type ReactNode } from 'react'
import type { WebAddressLink } from '../../../../../src/markdown/web-links'
import { nameLabel } from '../../../../../src/shared/name-label'
import type { Attachment } from '../../fixtures/attachments'
import type { MentionEntry } from '../../fixtures/fileMentions'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { EntryIcon } from '../files/fileIcons'
import { previewPaths } from '../files/previewPaths'
import { workspaceLabel } from '../workspaces/label'
import type { WorkspaceRow } from '../workspaces/sections'
import type { ChipRemoval } from './ChipRemove'
import { useChatWorkspaces } from './chatWorkspaces'
import { FileChip } from './FileChip'
import { entryName } from './entryPaths'
import { SentFileChip } from './SentFileChip'
import { SessionChip, type ChipSession } from './SessionChip'
import { strongRuns } from './strongText'
import { CodeText, WebLinkPart } from './WebLinkText'
import {
  linkPage,
  linkTarget,
  textParts,
  type LinkTarget,
  type TextPart,
} from './workspaceLinks'
import {
  WorkspaceChip,
  type ChipOpener,
  type ChipWorkspace,
} from './WorkspaceChip'

/** What the chip of a workspace shows of its row in the list of the org. */
function chipOf(row: WorkspaceRow): ChipWorkspace {
  return {
    label: workspaceLabel(row.workspace.number),
    name: row.workspace.name,
    status: row.status,
    github: row.github,
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
 * The chip of a link to a workspace of the org: a session chip when the
 * chat read the session that the link names, or the chip of the workspace.
 * `opener` makes the chip of a sent message or an answer open its page.
 * `removal` gives the chip of a message box the cell of its mark.
 */
export function LinkChip(props: {
  target: LinkTarget
  opener?: (chip: ChipOpener) => ReactNode
  pointer?: boolean
}) {
  const { row, session } = props.target
  const removal = (name: string): ChipRemoval | undefined =>
    props.pointer === undefined ? undefined : { name, pointer: props.pointer }
  if (session) {
    const chip: ChipSession = {
      workspace: {
        label: workspaceLabel(row.workspace.number),
        status: row.status,
        github: row.github,
      },
      title: nameLabel(session.title),
    }
    return (
      <SessionChip
        opener={props.opener}
        removal={removal(`${chip.workspace.label} ${chip.title}`)}
        session={chip}
      />
    )
  }
  const chip = chipOf(row)
  return (
    <WorkspaceChip
      opener={props.opener}
      removal={removal(`${chip.label} ${chip.name}`)}
      workspace={chip}
    />
  )
}

/**
 * The chip of the workspace or the session that a link names. A press on
 * the chip opens its page, when the mockups draw it.
 */
function TargetChip(props: { target: LinkTarget }) {
  const to = linkPage(props.target)
  return (
    <LinkChip
      opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
      target={props.target}
    />
  )
}

/**
 * A link of chat text: the chip of a workspace of the org, or a link that
 * `WebLinkPart` draws. `answer` shows a Markdown link as its label.
 */
function ChatLink(props: { part: WebAddressLink; answer: boolean }) {
  const target = linkTarget(props.part.href, useChatWorkspaces())
  if (target) return <TargetChip target={target} />
  return <WebLinkPart answer={props.answer} part={props.part} />
}

/**
 * One part of the text of a message: text, code, a chip, or a link. While
 * its message `waits` for the cloud computer, the chip of an attached file
 * opens nothing, because its copy does not exist yet.
 */
function Part(props: { part: TextPart; answer: boolean; waits?: boolean }) {
  const { part } = props
  if (part.kind === 'text') return part.text
  if (part.kind === 'code') {
    return <CodeText href={part.href} text={part.text} />
  }
  if (part.kind === 'attached') {
    const tab = props.waits === true ? undefined : part.file.tab
    const to = tab ? attachedTabs[tab] : undefined
    return (
      <SentFileChip
        file={part.file}
        mention={part.source}
        opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
      />
    )
  }
  if (part.kind === 'mention') {
    const to = filePage(part.entry)
    return (
      <FileChip
        entry={part.entry}
        icon={iconOf(part.entry)}
        mention={part.source}
        opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
      />
    )
  }
  return <ChatLink answer={props.answer} part={part} />
}

/**
 * The link of a session, as the line of a stop from a session shows it:
 * the chip of the session, or of its workspace while the chat did not read
 * the session. A link that the chat does not find stays text: `source`,
 * the link as the text has it, else `href`.
 */
export function LinkText(props: { href: string; source?: string }) {
  const target = linkTarget(props.href, useChatWorkspaces())
  if (!target) return props.source ?? props.href
  return <TargetChip target={target} />
}

/**
 * The text of a sent message or an answer. Each part in backticks is code,
 * and each link to a workspace of the org is a chip that opens the
 * workspace, when the mockups draw its screen. A link to a session that the
 * chat read is a session chip that opens the session. A Markdown link to a
 * workspace or a session shows as the chip alone. Each other `http` and
 * `https` address is a link, as `WebLinkPart` says. Code that holds only an
 * address shows it as a link in its code box, and other code stays code.
 * With `strong`, as in an answer, `**` marks bold, and a Markdown link
 * shows as its label. In the text of a member, `mentions` makes each
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
  strong?: boolean
  files?: readonly Attachment[]
  waits?: boolean
}) {
  const answer = props.strong === true
  const parts = textParts(props.text, true, props.mentions, props.files)
  const runs = answer ? strongRuns(parts) : [{ strong: false, parts }]
  return runs.map((run, index) => {
    const content = run.parts.map((part, inner) => (
      <Part answer={answer} key={inner} part={part} waits={props.waits} />
    ))
    return run.strong ? (
      <strong key={index}>{content}</strong>
    ) : (
      <Fragment key={index}>{content}</Fragment>
    )
  })
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
