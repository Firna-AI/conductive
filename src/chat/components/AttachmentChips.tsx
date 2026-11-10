import { FileText, ImageIcon, X } from 'lucide-react'
import type { Attachment } from '../../shared/messages'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/chat/AttachmentChips.module.css'
import {
  ChipIconCell,
  useNoHover,
} from '../../../docs/mockups/src/components/chat/ChipRemove'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import { IconButton } from '../ui/actions'
import local from './chat.module.css'

function FileIcon(props: { file: Attachment }) {
  return props.file.kind === 'image' ? (
    <ImageIcon aria-hidden className={styles.icon} size={13} />
  ) : (
    <FileText aria-hidden className={styles.icon} size={13} />
  )
}

/** A file of a sent message: its icon, its name, and its size. */
function SentChip(props: { file: Attachment }) {
  const { file } = props
  return (
    <li className={styles.chip}>
      <FileIcon file={file} />
      <span className={styles.name}>{file.name}</span>
      <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
    </li>
  )
}

/**
 * The files attached to the next message. Each file shows its icon in a
 * cell at its start, which a pointer or the keyboard focus turns into a ×
 * that removes the file. Where no pointer hovers, the icon
 * stays, and a × button of touch size ends the file. The
 * chat and both New workspace forms show the files of a draft with it.
 */
export function DraftFiles(props: {
  attachments: readonly Attachment[]
  onRemove: (id: string) => void
}) {
  const noHover = useNoHover()
  return (
    <ul aria-label="Attached files" className={styles.chips}>
      {props.attachments.map((file) => {
        const remove = () => props.onRemove(file.id)
        return (
          <li
            className={classes(
              styles.chip,
              styles.removable,
              noHover && styles.withEnd,
            )}
            key={file.id}
          >
            <ChipIconCell
              focusable
              icon={<FileIcon file={file} />}
              removal={{ name: file.name, onRemove: remove }}
            />
            <span className={styles.name}>{file.name}</span>
            <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
            {noHover ? (
              <IconButton
                icon={X}
                label={`Remove ${file.name}`}
                onPress={remove}
                quiet
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** The files that a sent message carries, under its bubble. */
export function SentFiles(props: { attachments: readonly Attachment[] }) {
  return (
    <ul
      aria-label="Attached files"
      className={classes(styles.chips, local.sentFiles)}
    >
      {props.attachments.map((file) => (
        <SentChip file={file} key={file.id} />
      ))}
    </ul>
  )
}
