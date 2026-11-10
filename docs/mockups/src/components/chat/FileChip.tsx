import type { ReactNode } from 'react'
import type { MentionEntry } from '../../fixtures/fileMentions'
import a11y from '../common/a11y.module.css'
import { ChipEndRemove, ChipIconCell, type ChipRemoval } from './ChipRemove'
import { entryName } from './entryPaths'
import base from './InlineChip.module.css'
import { useChipClass, type ChipOpener } from './WorkspaceChip'
import styles from './FileChip.module.css'

/**
 * A file or a folder of the workspace in a line of text: a small rounded
 * pill with the icon and the name of the entry, as All files draws them
 * (decision 213). Its title is the whole path. Screen readers hear "File"
 * or "Folder" before the name. It has the size of a workspace chip.
 *
 * In a sent message, `opener` makes the chip the element that opens the
 * file, as a press in All files does. In a message box, `removal` gives the
 * chip the cell of its icon, which a pointer turns into a × that removes
 * the chip, and a press on the name opens the file. The caller gives the
 * icon, so the app draws the icons of its own All files. `mention` marks
 * the chip with its text, so a copy of a sent message can give it.
 */
export function FileChip(props: {
  entry: MentionEntry
  icon: ReactNode
  mention?: string
  opener?: (chip: ChipOpener) => ReactNode
  removal?: ChipRemoval
  /** The label of the name, when it differs from the last part of the path. */
  name?: string
  /** The label of the whole path, for the title. */
  title?: string
  /** In a message box, a press on the name opens the file. */
  onOpen?: () => void
}) {
  const { entry, removal } = props
  const name = props.name ?? entryName(entry)
  const nameText = <span className={base.name}>{name}</span>
  const icon = <span className={styles.icon}>{props.icon}</span>
  const chip: ChipOpener = {
    className: useChipClass(removal),
    'data-mention': props.mention,
    title: props.title ?? (entry.folder ? `${entry.path}/` : entry.path),
    children: (
      <>
        {removal ? <ChipIconCell icon={icon} removal={removal} /> : icon}
        <span className={base.text}>
          <span className={a11y.hidden}>
            {entry.folder ? 'Folder ' : 'File '}
          </span>
          {props.onOpen ? (
            <button
              className={styles.open}
              onClick={props.onOpen}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
              type="button"
            >
              {nameText}
            </button>
          ) : (
            nameText
          )}
        </span>
        {removal ? <ChipEndRemove removal={removal} /> : null}
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
