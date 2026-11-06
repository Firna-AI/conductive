import { FileText, ImageIcon, X } from 'lucide-react'
import type { Attachment } from '../../shared/messages'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/chat/AttachmentChips.module.css'
import { formatBytes } from '../state/format'
import { IconButton } from '../ui/actions'
import local from './chat.module.css'

function Chip(props: { file: Attachment; onRemove?: (id: string) => void }) {
  const { file, onRemove } = props
  const Icon = file.kind === 'image' ? ImageIcon : FileText
  return (
    <li className={styles.chip}>
      <Icon aria-hidden className={styles.icon} size={13} />
      <span className={styles.name}>{file.name}</span>
      <span className={styles.size}>{formatBytes(file.sizeBytes)}</span>
      {onRemove ? (
        <IconButton
          icon={X}
          label={`Remove ${file.name}`}
          onPress={() => onRemove(file.id)}
          quiet
        />
      ) : null}
    </li>
  )
}

/** The files attached to the next message, each with a way to remove it. */
export function DraftFiles(props: {
  attachments: readonly Attachment[]
  onRemove: (id: string) => void
}) {
  return (
    <ul aria-label="Attached files" className={styles.chips}>
      {props.attachments.map((file) => (
        <Chip file={file} key={file.id} onRemove={props.onRemove} />
      ))}
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
        <Chip file={file} key={file.id} />
      ))}
    </ul>
  )
}
