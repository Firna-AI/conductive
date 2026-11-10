import { FileText, ImageIcon, X } from 'lucide-react'
import type { Attachment } from '../../fixtures/attachments'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { ChipIconCell, useNoHover } from './ChipRemove'
import { formatSize } from './sizes'
import styles from './AttachmentChips.module.css'

/**
 * The files attached to the next message. Each file shows its icon in a
 * cell at its start, which a pointer or the keyboard focus turns into a ×
 * that removes the file. Where no pointer hovers, the icon
 * stays, and the × button of touch size follows the size, as before
 *. A view has no pointer, so `pointer` names the file that
 * it draws with the pointer over its icon.
 */
export function AttachmentChips(props: {
  attachments: readonly Attachment[]
  pointer?: string
}) {
  const noHover = useNoHover()
  return (
    <ul aria-label="Attached files" className={styles.chips}>
      {props.attachments.map((file) => {
        const Icon = file.kind === 'image' ? ImageIcon : FileText
        const removal = {
          name: file.name,
          pointer: props.pointer === file.name,
        }
        return (
          <li
            className={classes(
              styles.chip,
              styles.removable,
              noHover && styles.withEnd,
            )}
            key={file.name}
          >
            <ChipIconCell
              focusable
              icon={<Icon aria-hidden size={13} />}
              removal={removal}
            />
            <span className={styles.name}>{file.name}</span>
            <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
            {noHover ? (
              <IconButton icon={X} label={`Remove ${file.name}`} quiet />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
