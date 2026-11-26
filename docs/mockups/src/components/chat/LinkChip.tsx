import type { ReactNode } from 'react'
import type { LinkTarget as ReadTarget } from '../../../../../src/chat/links/workspace-links'
import { nameLabel } from '../../../../../src/shared/name-label'
import { ScreenLink } from '../common/ScreenLink'
import { workspaceLabel } from '../../../../../src/ui/components/workspaces/label'
import type { WorkspaceRow } from '../workspaces/sections'
import { useChatWorkspaces } from './chatWorkspaces'
import type { ChipRemoval } from '../../../../../src/ui/components/chat/ChipRemove'
import {
  SessionChip,
  type ChipSession,
} from '../../../../../src/ui/components/chat/SessionChip'
import {
  linkPage,
  linkTarget,
  rowTarget,
  type LinkTarget,
} from './workspaceLinks'
import {
  WorkspaceChip,
  type ChipOpener,
  type ChipWorkspace,
} from '../../../../../src/ui/components/chat/WorkspaceChip'

/** What the chip of a workspace shows of its row in the list of the org. */
function chipOf(row: WorkspaceRow): ChipWorkspace {
  return {
    label: workspaceLabel(row.workspace.number),
    name: row.workspace.name,
    status: row.status,
    github: row.github,
    ...(row.workspace.messageWaiting !== undefined && {
      messageWaiting: row.workspace.messageWaiting,
    }),
  }
}

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
        ...(row.workspace.messageWaiting !== undefined && {
          messageWaiting: row.workspace.messageWaiting,
        }),
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
 * The chip of a link that a reader of the app found in chat text, with the
 * row of its workspace in the chat. The readers find only the workspaces of
 * the rows, so each target has its row. A target without a row would show
 * `text`.
 */
export function ReadChip(props: { target: ReadTarget; text?: string }) {
  const target = rowTarget(props.target, useChatWorkspaces())
  return target ? <TargetChip target={target} /> : (props.text ?? null)
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
