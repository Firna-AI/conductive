import { FileText, ImageIcon, X } from 'lucide-react'
import type { Attachment } from '../../fixtures/attachments'
import { IconButton } from '../common/actions'
import styles from './AttachmentChips.module.css'

/** The files attached to the next message, each with a way to remove it. */
export function AttachmentChips(props: { attachments: readonly Attachment[] }) {
  return (
    <ul aria-label="Attached files" className={styles.chips}>
      {props.attachments.map((file) => {
        const Icon = file.kind === 'image' ? ImageIcon : FileText
        return (
          <li className={styles.chip} key={file.name}>
            <Icon aria-hidden className={styles.icon} size={13} />
            <span className={styles.name}>{file.name}</span>
            <span className={styles.size}>{file.size}</span>
            <IconButton icon={X} label={`Remove ${file.name}`} quiet />
          </li>
        )
      })}
    </ul>
  )
}
