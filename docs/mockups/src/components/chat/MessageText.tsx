import { Fragment, type ReactNode } from 'react'
import { nameLabel } from '../../../../../src/shared/name-label'
import type { MentionEntry } from '../../fixtures/fileMentions'
import inline from '../common/InlineText.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { EntryIcon } from '../files/fileIcons'
import { previewPaths } from '../files/previewPaths'
import { workspaceLabel } from '../workspaces/label'
import type { WorkspaceRow } from '../workspaces/sections'
import type { ChipRemoval } from './ChipRemove'
import { useChatWorkspaces, type ChatRow } from './chatWorkspaces'
import { FileChip } from './FileChip'
import { entryName } from './entryPaths'
import { SessionChip, type ChipSession } from './SessionChip'
import { strongRuns } from './strongText'
import {
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

function chipOf(row: WorkspaceRow): ChipWorkspace {
  return {
    label: workspaceLabel(row.workspace.number),
    name: row.workspace.name,
    status: row.status,
  }
}

/** The icon of an entry, as the All files of the mockups draws it. */
function iconOf(entry: MentionEntry) {
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
 * The page that a press on the chip of a link opens, when the mockups draw
 * it: the session of a session link, or the page of the workspace. A link
 * to a closed session opens the page of its workspace, so a press reopens
 * no tab for the other members.
 */
function linkPage(target: LinkTarget): string | undefined {
  const { row, session } = target
  return session && !session.closed ? session.to : row.to
}

/**
 * The chip of a link to a workspace of the org: a session chip when the
 * chat read the session that the link names, or the chip of the workspace.
 * `opener` makes the chip of a sent message or an answer open its page.
 * `removal` gives the chip of a message box the cell of its mark.
 */
function LinkChip(props: {
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

/** One part of the text of a message: text, code, or a chip. */
function Part(props: { part: TextPart }) {
  const { part } = props
  if (part.kind === 'text') return part.text
  if (part.kind === 'code') {
    return <code className={inline.code}>{part.text}</code>
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
  return <LinkText href={part.href} source={part.source} />
}

/**
 * One link as the chat shows it: the chip of the workspace that the link
 * names, or a session chip when the chat read the session. A press on the
 * chip opens its page, when the mockups draw it. A link that the chat does
 * not find stays text: `source`, the link as the text has it, else `href`.
 * A message shows each of its links so, and the line of a stop from a
 * session shows the link of that session so.
 */
export function LinkText(props: { href: string; source?: string }) {
  const target = linkTarget(props.href, useChatWorkspaces())
  if (!target) return props.source ?? props.href
  const to = linkPage(target)
  return (
    <LinkChip
      opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
      target={target}
    />
  )
}

/**
 * The text of a sent message or an answer. Each part in backticks is code,
 * and each link to a workspace of the org is a chip that opens the
 * workspace, when the mockups draw its screen. A link to a session that the
 * chat read is a session chip that opens the session. A Markdown link to a
 * workspace or a session shows as the chip alone. Other links stay plain
 * text, and so does a link in code. With `strong`, as in an answer, `**`
 * marks bold. In the text of a member, `mentions` makes each mention of a
 * file or a folder of the tree a chip that opens the file.
 */
export function MessageText(props: {
  text: string
  mentions?: boolean
  strong?: boolean
}) {
  const parts = textParts(props.text, true, props.mentions)
  const runs = props.strong ? strongRuns(parts) : [{ strong: false, parts }]
  return runs.map((run, index) => {
    const content = run.parts.map((part, inner) => (
      <Part key={inner} part={part} />
    ))
    return run.strong ? (
      <strong key={index}>{content}</strong>
    ) : (
      <Fragment key={index}>{content}</Fragment>
    )
  })
}

/**
 * The draft holds a chip: a link to a workspace of the org or to one of its
 * sessions, or a mention of a file or a folder of the tree.
 */
export function holdsChips(draft: string, rows: readonly ChatRow[]): boolean {
  return textParts(draft, false, true).some(
    (part) =>
      part.kind === 'mention' ||
      (part.kind === 'link' && linkTarget(part.href, rows) !== undefined),
  )
}

/**
 * The draft of a message box as plain text, with each link to a workspace
 * of the org or to one of its sessions, and each mention of the tree, as a
 * chip. A chip is one unit of the text, which the caret steps over and
 * Backspace removes whole, so it is not editable inside the editable field.
 * Each chip starts with the cell of its icon, which a pointer turns into a
 * × that removes it. In the app a press on the name of a file chip opens
 * the file. A view has no pointer, so `pointer` draws it over the icon of
 * the first chip.
 */
export function DraftText(props: { text: string; pointer?: boolean }) {
  const rows = useChatWorkspaces()
  const parts = textParts(props.text, false, true)
  const firstChip = parts.findIndex(
    (part) =>
      part.kind === 'mention' ||
      (part.kind === 'link' && linkTarget(part.href, rows) !== undefined),
  )
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === 'text' || part.kind === 'code') return part.text
        const pointer = props.pointer === true && index === firstChip
        if (part.kind === 'mention') {
          const name = entryName(part.entry)
          return (
            <span contentEditable={false} key={index}>
              <FileChip
                entry={part.entry}
                icon={iconOf(part.entry)}
                removal={{ name, pointer }}
              />
            </span>
          )
        }
        const target = linkTarget(part.href, rows)
        if (!target) return part.source
        return (
          <span contentEditable={false} key={index}>
            <LinkChip pointer={pointer} target={target} />
          </span>
        )
      })}
    </>
  )
}
