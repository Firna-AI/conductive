import type { Attachment } from '../../fixtures/attachments'
import type { MentionEntry } from '../../fixtures/fileMentions'
import { useChatWorkspaces, type ChatRow } from './chatWorkspaces'
import { DraftFileChip, type ChipUpload } from './DraftFileChip'
import { draftParts } from '../../../../../src/app/draft-marks'
import { entryName } from './entryPaths'
import { FileChip } from './FileChip'
import { iconOf, LinkChip } from './MessageText'
import { linkTarget, textParts, type LinkTarget } from './workspaceLinks'
import styles from './DraftText.module.css'

/** A part of a draft as the field draws it: text, the caret, or a chip. */
type DraftItem =
  | { kind: 'text'; text: string }
  | { kind: 'caret' }
  | { kind: 'file'; file: Attachment }
  | { kind: 'mention'; entry: MentionEntry }
  | { kind: 'link'; target: LinkTarget }

/**
 * The parts of a draft: its text, the chip of each attached file at its
 * mark, the chip of each link to a workspace of the org or to one of its
 * sessions, and the chip of each mention of the tree. A mark of a file that
 * the draft does not hold shows nothing.
 */
function itemsOf(
  text: string,
  files: readonly Attachment[],
  rows: readonly ChatRow[],
): DraftItem[] {
  return draftParts(text).flatMap((part): DraftItem[] => {
    if (part.kind === 'file') {
      const file = files.find((item) => item.id === part.id)
      return file ? [{ kind: 'file', file }] : []
    }
    return textParts(part.text, false, true).map((piece): DraftItem => {
      switch (piece.kind) {
        case 'mention':
          return { kind: 'mention', entry: piece.entry }
        case 'link': {
          const target = linkTarget(piece.href, rows)
          return target
            ? { kind: 'link', target }
            : { kind: 'text', text: piece.source }
        }
        case 'attached':
          return { kind: 'text', text: piece.source }
        case 'text':
        case 'code':
          return { kind: 'text', text: piece.text }
      }
    })
  })
}

/** The caret, which stands between two parts of the text. */
const caretItem: DraftItem = { kind: 'caret' }

function isChip(item: DraftItem): boolean {
  return item.kind === 'file' || item.kind === 'mention' || item.kind === 'link'
}

/**
 * The draft holds a chip: an attached file, a link to a workspace of the
 * org or to one of its sessions, or a mention of a file or a folder of the
 * tree.
 */
export function holdsChips(draft: string, rows: readonly ChatRow[]): boolean {
  return (
    draftParts(draft).some((part) => part.kind === 'file') ||
    itemsOf(draft, [], rows).some(isChip)
  )
}

/** The upload of a file of the draft, as its chip shows it. */
function uploadOf(file: Attachment): ChipUpload {
  if (file.state === 'failed') return { state: 'failed' }
  if (file.state === 'uploading') {
    return { state: 'uploading', sentBytes: file.sentBytes ?? null }
  }
  return { state: 'ready' }
}

/**
 * The draft of a message box as plain text, with each attached file, each
 * link to a workspace of the org or to one of its sessions, and each
 * mention of the tree as a chip. A link to a session that the chat read is
 * a session chip. A chip is one unit of the text, which the caret steps
 * over and Backspace removes whole, so it is not editable inside the
 * editable field. Each chip starts with the cell of its icon, which a
 * pointer turns into a × that removes it. In the app a press on the name of
 * a file chip opens the file, and a press on the name of an attached file
 * opens nothing.
 *
 * `files` are the files of the draft, by the draft IDs of their marks. A
 * view runs no script, so `caret` draws the caret at that index of the
 * text: where a drop puts its files while they hover over the box, or
 * where the caret stands after a drop or a pick. A view has no pointer, so
 * `pointer` draws it over the icon of the first chip.
 */
export function DraftText(props: {
  text: string
  files?: readonly Attachment[]
  pointer?: boolean
  caret?: number
}) {
  const rows = useChatWorkspaces()
  const files = props.files ?? []
  const { text, caret } = props
  const items =
    caret === undefined
      ? itemsOf(text, files, rows)
      : [
          ...itemsOf(text.slice(0, caret), files, rows),
          caretItem,
          ...itemsOf(text.slice(caret), files, rows),
        ]
  const firstChip = items.findIndex(isChip)
  return (
    <>
      {items.map((item, index) => {
        const pointer = props.pointer === true && index === firstChip
        switch (item.kind) {
          case 'text':
            return item.text
          case 'caret':
            return <span aria-hidden className={styles.caret} key={index} />
          case 'file':
            return (
              <span contentEditable={false} key={index}>
                <DraftFileChip
                  file={item.file}
                  removal={{ name: item.file.name, pointer }}
                  upload={uploadOf(item.file)}
                />
              </span>
            )
          case 'mention':
            return (
              <span contentEditable={false} key={index}>
                <FileChip
                  entry={item.entry}
                  icon={iconOf(item.entry)}
                  removal={{ name: entryName(item.entry), pointer }}
                />
              </span>
            )
          case 'link':
            return (
              <span contentEditable={false} key={index}>
                <LinkChip pointer={pointer} target={item.target} />
              </span>
            )
        }
      })}
    </>
  )
}
