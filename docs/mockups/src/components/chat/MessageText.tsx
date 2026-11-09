import inline from '../common/InlineText.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { workspaceLabel } from '../workspaces/label'
import type { WorkspaceRow } from '../workspaces/sections'
import { useChatWorkspaces } from './chatWorkspaces'
import { linkedWorkspace, textParts } from './workspaceLinks'
import { WorkspaceChip, type ChipWorkspace } from './WorkspaceChip'

function chipOf(row: WorkspaceRow): ChipWorkspace {
  return {
    label: workspaceLabel(row.workspace.number),
    name: row.workspace.name,
    status: row.status,
  }
}

/**
 * The text of a sent message or an answer. Each part in backticks is code,
 * and each link to a workspace of the org is a chip that opens the
 * workspace, when the mockups draw its screen. A Markdown link to a
 * workspace shows as the chip alone. Other links stay plain text, and so
 * does a link in code.
 */
export function MessageText(props: { text: string }) {
  const rows = useChatWorkspaces()
  return (
    <>
      {textParts(props.text, true).map((part, index) => {
        if (part.kind === 'text') return part.text
        if (part.kind === 'code') {
          return (
            <code className={inline.code} key={index}>
              {part.text}
            </code>
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

/** The draft holds a link to a workspace of the org, which shows as a chip. */
export function linksWorkspace(
  draft: string,
  rows: readonly WorkspaceRow[],
): boolean {
  return textParts(draft, false).some(
    (part) =>
      part.kind === 'link' && linkedWorkspace(part.href, rows) !== undefined,
  )
}

/**
 * The draft of a message box as plain text, with each link to a workspace
 * of the org as a chip. A chip in the box opens nothing. It is one unit of
 * the text, which the caret steps over and Backspace removes whole, so it
 * is not editable inside the editable field.
 */
export function DraftText(props: { text: string }) {
  const rows = useChatWorkspaces()
  return (
    <>
      {textParts(props.text, false).map((part, index) => {
        if (part.kind !== 'link') return part.text
        const row = linkedWorkspace(part.href, rows)
        if (!row) return part.source
        return (
          <span contentEditable={false} key={index}>
            <WorkspaceChip workspace={chipOf(row)} />
          </span>
        )
      })}
    </>
  )
}
