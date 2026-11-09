import type { ReactNode } from 'react'
import type { MentionEntry } from '../../fixtures/fileMentions'
import a11y from '../common/a11y.module.css'
import { EntryIcon } from '../files/fileIcons'
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
 * the chip, and a press on the name opens the file.
 */
export function FileChip(props: {
  entry: MentionEntry
  opener?: (chip: ChipOpener) => ReactNode
  removal?: ChipRemoval
}) {
  const { entry, removal } = props
  const name = entryName(entry)
  const icon = (
    <EntryIcon
      className={styles.icon}
      folder={entry.folder}
      name={name}
      size={12}
    />
  )
  const chip: ChipOpener = {
    className: useChipClass(removal),
    title: entry.folder ? `${entry.path}/` : entry.path,
    children: (
      <>
        {removal ? <ChipIconCell icon={icon} removal={removal} /> : icon}
        <span className={base.text}>
          <span className={a11y.hidden}>
            {entry.folder ? 'Folder ' : 'File '}
          </span>
          <span className={base.name}>{name}</span>
        </span>
        {removal ? <ChipEndRemove removal={removal} /> : null}
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
