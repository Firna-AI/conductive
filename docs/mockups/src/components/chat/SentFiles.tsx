import type { Attachment } from '../../fixtures/attachments'
import { classes } from '../../../../../src/ui/components/common/classes'
import { kindIcon } from '../../entries/components/chat/attachedFileParts.mockup'
import { instanceKey } from '../../instanceKey'
import { formatSize } from '../../../../../src/ui/components/chat/sizes'
import styles from '../../../../../src/ui/components/chat/AttachmentChips.module.css'
import states from '../../../../../src/ui/components/chat/AttachmentStates.module.css'

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
          <kindIcon.Component
            className={styles.icon}
            kind={file.kind}
            moklyInstance={`kind-${instanceKey(file.id)}`}
            size={13}
          />
          <span className={styles.name}>{file.name}</span>
          <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
        </li>
      ))}
    </ul>
  )
}
