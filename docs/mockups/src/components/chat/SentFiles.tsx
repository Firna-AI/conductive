import type { Attachment } from '../../fixtures/attachments'
import { classes } from '../common/classes'
import { KindIcon } from './attachedFileParts'
import { formatSize } from './sizes'
import styles from './AttachmentChips.module.css'
import states from './AttachmentStates.module.css'

/**
 * The files of a sent message that its text does not show, under its
 * bubble, at the right: the icon of the kind of each file, its name, and
 * its size. A message from before files had a place in the text holds no
 * mention of its files, so they all show here.
 */
export function SentFiles(props: { files: readonly Attachment[] }) {
  return (
    <ul
      aria-label="Attached files"
      className={classes(styles.chips, states.sent)}
    >
      {props.files.map((file) => (
        <li className={classes(styles.chip, states.fixed)} key={file.id}>
          <KindIcon className={styles.icon} kind={file.kind} size={13} />
          <span className={styles.name}>{file.name}</span>
          <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
        </li>
      ))}
    </ul>
  )
}
