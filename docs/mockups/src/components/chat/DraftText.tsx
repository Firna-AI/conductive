import { draftParts } from '../../../../../src/app/draft-marks'
import { webAddressParts } from '../../../../../src/markdown/web-links'
import type { AgentSkill } from '../../../../../src/shared/generated/AgentSkill'
import { mentionParts } from '../../../../../src/shared/mention-text'
import { skillTextAt } from '../../../../../src/shared/skill-text'
import { draftFileChip } from '../../entries/components/chat/DraftFileChip.mockup'
import { instanceKey } from '../../instanceKey'
import type { Attachment } from '../../fixtures/attachments'
import type { MentionEntry } from '../../../../../src/ui/components/chat/mentionEntry'
import { findEntry, findSkill, mockupEntry } from './chatReading'
import { useChatWorkspaces } from './chatWorkspaces'
import type { ChipUpload } from '../../../../../src/ui/components/chat/DraftFileChip'
import { entryName } from '../../../../../src/ui/components/chat/entryPaths'
import { FileChip } from '../../../../../src/ui/components/chat/FileChip'
import { SkillChip } from '../../../../../src/ui/components/chat/SkillChip'
import { noop } from '../../../../../src/ui/noop'
import { LinkChip } from './LinkChip'
import { iconOf } from './MentionChip'
import { linkTarget, type LinkTarget, type RowLinks } from './workspaceLinks'
import styles from '../../../../../src/ui/components/chat/DraftText.module.css'

/** A part of a draft as the field draws it: text, the caret, or a chip. */
type DraftItem =
  | { kind: 'text'; text: string }
  | { kind: 'caret' }
  | { kind: 'file'; file: Attachment }
  | { kind: 'mention'; entry: MentionEntry }
  | { kind: 'skill'; skill: AgentSkill }
  | { kind: 'link'; target: LinkTarget }

/**
 * The items of text outside mentions and skill texts: each link to a
 * workspace of the org or to one of its sessions is a chip, and the rest
 * stays text.
 */
function linkItems(text: string, links: RowLinks): DraftItem[] {
  return webAddressParts(text).map((part): DraftItem => {
    if (part.kind === 'text') return part
    const target = linkTarget(part.href, links)
    return target
      ? { kind: 'link', target }
      : { kind: 'text', text: part.source }
  })
}

/**
 * The items of text outside mentions, with each skill text that
 * `skillTextAt` of the app reads: a skill chip when it names a skill of the
 * list, else text. The rest gives its links.
 */
function skillItems(text: string, links: RowLinks): DraftItem[] {
  const items: DraftItem[] = []
  let plain = ''
  let index = 0
  while (index < text.length) {
    const found = skillTextAt(text, index)
    if (!found) {
      plain += text[index]
      index += 1
      continue
    }
    const skill = findSkill(found.name)
    items.push(
      ...linkItems(plain, links),
      skill ? { kind: 'skill', skill } : { kind: 'text', text: found.source },
    )
    plain = ''
    index += found.source.length
  }
  return [...items, ...linkItems(plain, links)]
}

/**
 * The parts of a draft, as the field of the app finds its chips: its text,
 * the chip of each attached file at its mark, and the chip of each mention
 * of an entry of the tree, as `mentionParts` of the app reads it. The rest
 * gives the chips of its skills and of its links to the workspaces of the
 * org or to their sessions. A mark of a file that the draft does not hold
 * shows nothing.
 */
function itemsOf(
  text: string,
  files: readonly Attachment[],
  links: RowLinks,
): DraftItem[] {
  return draftParts(text).flatMap((part): DraftItem[] => {
    if (part.kind === 'file') {
      const file = files.find((item) => item.id === part.id)
      return file ? [{ kind: 'file', file }] : []
    }
    return mentionParts(part.text).flatMap((piece): DraftItem[] => {
      if (piece.kind === 'text') return skillItems(piece.text, links)
      const entry = findEntry(piece.path, piece.folder)
      return entry
        ? [{ kind: 'mention', entry: mockupEntry(entry) }]
        : [{ kind: 'text', text: piece.source }]
    })
  })
}

/** The caret, which stands between two parts of the text. */
const caretItem: DraftItem = { kind: 'caret' }

function isChip(item: DraftItem): boolean {
  return item.kind !== 'text' && item.kind !== 'caret'
}

/**
 * The draft holds a chip: an attached file, a link to a workspace of the
 * org or to one of its sessions, a mention of a file or a folder of the
 * tree, or a skill.
 */
export function holdsChips(draft: string, links: RowLinks): boolean {
  return (
    draftParts(draft).some((part) => part.kind === 'file') ||
    itemsOf(draft, [], links).some(isChip)
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
 * link to a workspace of the org or to one of its sessions, each mention
 * of the tree, and each skill as a chip. A link to a session that the
 * chat read is a session chip. A chip is one unit of the text, which the
 * caret steps over and Backspace removes whole, so it is not editable
 * inside the editable field. Each chip starts with the cell of its icon,
 * which a pointer turns into a × that removes it. In the app a press on
 * the name of a file chip opens the file, and a press on the name of an
 * attached file opens nothing. A press on the name of a skill chip opens
 * the skill in the temporary tab, as the shared `SkillChip` says.
 *
 * `files` are the files of the draft, by the draft IDs of their marks. A
 * view runs no script, so `caret` draws the caret at that index of the
 * text: where a drop puts its files while they hover over the box, or
 * where the caret stands after a drop or a pick. A view has no pointer, so
 * `pointer` draws it over the icon of the first chip, and `namePointer`
 * over the name of the first chip when that chip is a skill chip.
 *
 * The draft ID of an attached file names its chip for Mokly. A mention and
 * a link can repeat in a draft, so their chips keep the plain parts.
 */
export function DraftText(props: {
  text: string
  files?: readonly Attachment[]
  pointer?: boolean
  namePointer?: boolean
  caret?: number
}) {
  const links = useChatWorkspaces()
  const files = props.files ?? []
  const { text, caret } = props
  const items =
    caret === undefined
      ? itemsOf(text, files, links)
      : [
          ...itemsOf(text.slice(0, caret), files, links),
          caretItem,
          ...itemsOf(text.slice(caret), files, links),
        ]
  const firstChip = items.findIndex(isChip)
  return (
    <>
      {items.map((item, index) => {
        const first = index === firstChip
        const pointer = props.pointer === true && first
        switch (item.kind) {
          case 'text':
            return item.text
          case 'caret':
            return <span aria-hidden className={styles.caret} key={index} />
          case 'file':
            return (
              <span contentEditable={false} key={index}>
                <draftFileChip.Component
                  file={{
                    name: item.file.name,
                    kind: item.file.kind,
                    sizeBytes: item.file.sizeBytes,
                  }}
                  moklyInstance={`file-${instanceKey(item.file.id)}`}
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
          case 'skill':
            return (
              <span contentEditable={false} key={index}>
                <SkillChip
                  namePointer={props.namePointer === true && first}
                  onOpen={noop}
                  removal={{ name: item.skill.name, pointer }}
                  skill={item.skill}
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
