import { CircleAlert, FileText, ImageIcon, Paperclip } from 'lucide-react'
import type { Attachment } from '../../shared/messages'
import {
  notAttachedCountTitle,
  notAttachedTitle,
  smallerFileLabel,
  tooLargeBody,
} from '../../../docs/mockups/src/components/chat/attachmentCopy'
import styles from '../../../docs/mockups/src/components/chat/AttachmentChips.module.css'
import states from '../../../docs/mockups/src/components/chat/AttachmentStates.module.css'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { ActionButton } from '../ui/actions'

function KindIcon(props: { kind: Attachment['kind'] }) {
  const Icon = props.kind === 'image' ? ImageIcon : FileText
  return <Icon aria-hidden className={styles.icon} size={13} />
}

/**
 * The files of a sent message without a chip in its text, under its
 * bubble, at the right. A message from before files had a place in the
 * text holds no mention of its files, so they all show here.
 */
export function SentFiles(props: { attachments: readonly Attachment[] }) {
  return (
    <ul
      aria-label="Attached files"
      className={classes(styles.chips, states.sent)}
    >
      {props.attachments.map((file) => (
        <li className={classes(styles.chip, states.fixed)} key={file.id}>
          <KindIcon kind={file.kind} />
          <span className={styles.name}>{file.name}</span>
          <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The notice over the composer for the files of the last pick that are over
 * the size limit. It names the file, or the count of files, and the limit,
 * but no size of the file. Its action opens the file picker again.
 */
export function OversizeNotice(props: {
  refused: readonly string[]
  onAttach: () => void
}) {
  const [first] = props.refused
  if (first === undefined) return null
  return (
    <Notice
      action={
        <ActionButton icon={Paperclip} onPress={props.onAttach}>
          {smallerFileLabel}
        </ActionButton>
      }
      body={tooLargeBody}
      icon={CircleAlert}
      title={
        props.refused.length === 1
          ? notAttachedTitle(first)
          : notAttachedCountTitle(props.refused.length)
      }
      tone="danger"
    />
  )
}
