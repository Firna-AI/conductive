import type { MentionEntry } from '../../fixtures/fileMentions'
import inline from '../common/InlineText.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { EntryIcon } from '../files/fileIcons'
import { previewPaths } from '../files/previewPaths'
import { workspaceLabel } from '../workspaces/label'
import type { WorkspaceRow } from '../workspaces/sections'
import { useChatWorkspaces } from './chatWorkspaces'
import { FileChip } from './FileChip'
import { entryName } from './entryPaths'
import { linkedWorkspace, textParts } from './workspaceLinks'
import { WorkspaceChip, type ChipWorkspace } from './WorkspaceChip'

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
 * The text of a sent message or an answer. Each part in backticks is code,
 * and each link to a workspace of the org is a chip that opens the
 * workspace, when the mockups draw its screen. A Markdown link to a
 * workspace shows as the chip alone. Other links stay plain text, and so
 * does a link in code. In the text of a member, `mentions` makes each
 * mention of a file or a folder of the tree a chip that opens the file.
 */
export function MessageText(props: { text: string; mentions?: boolean }) {
  const rows = useChatWorkspaces()
  return (
    <>
      {textParts(props.text, true, props.mentions).map((part, index) => {
        if (part.kind === 'text') return part.text
        if (part.kind === 'code') {
          return (
            <code className={inline.code} key={index}>
              {part.text}
            </code>
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
 * The draft holds a chip: a link to a workspace of the org, or a mention of
 * a file or a folder of the tree.
 */
export function holdsChips(
  draft: string,
  rows: readonly WorkspaceRow[],
): boolean {
  return textParts(draft, false, true).some(
    (part) =>
      part.kind === 'mention' ||
      (part.kind === 'link' && linkedWorkspace(part.href, rows) !== undefined),
  )
}

/**
 * The draft of a message box as plain text, with each link to a workspace
 * of the org and each mention of the tree as a chip. A chip is one unit of
 * the text, which the caret steps over and Backspace removes whole, so it
 * is not editable inside the editable field. Each chip starts with the
 * cell of its icon, which a pointer turns into a × that removes it. In
 * the app a press on the name of a file chip opens the file. A view has no
 * pointer, so `pointer` draws it over the icon of the first chip.
 */
export function DraftText(props: { text: string; pointer?: boolean }) {
  const rows = useChatWorkspaces()
  const parts = textParts(props.text, false, true)
  const firstChip = parts.findIndex(
    (part) =>
      part.kind === 'mention' ||
      (part.kind === 'link' && linkedWorkspace(part.href, rows) !== undefined),
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
        const row = linkedWorkspace(part.href, rows)
        if (!row) return part.source
        const chip = chipOf(row)
        return (
          <span contentEditable={false} key={index}>
            <WorkspaceChip
              removal={{ name: `${chip.label} ${chip.name}`, pointer }}
              workspace={chip}
            />
          </span>
        )
      })}
    </>
  )
}
