import { ProgressRing } from '@firna/ui/loader'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, FileText, ImageIcon, Paperclip, X } from 'lucide-react'
import type { DraftFile } from '../../app/draft-files'
import type { Attachment } from '../../shared/messages'
import {
  failedLabel,
  notAttachedCountTitle,
  notAttachedTitle,
  sentLabel,
  smallerFileLabel,
  tooLargeBody,
  tryAgainLabel,
  uploadingLabel,
} from '../../../docs/mockups/src/components/chat/attachmentCopy'
import styles from '../../../docs/mockups/src/components/chat/AttachmentChips.module.css'
import states from '../../../docs/mockups/src/components/chat/AttachmentStates.module.css'
import {
  ChipIconCell,
  useNoHover,
} from '../../../docs/mockups/src/components/chat/ChipRemove'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { ActionButton, IconButton } from '../ui/actions'

function KindIcon(props: { kind: Attachment['kind'] }) {
  const Icon = props.kind === 'image' ? ImageIcon : FileText
  return <Icon aria-hidden className={styles.icon} size={13} />
}

/**
 * The bytes of an upload that the browser measured as sent, or `null`
 * before the first measurement, and for an empty file.
 */
function sentBytesOf(item: DraftFile): number | null {
  if (item.state !== 'uploading' || item.file.size === 0) return null
  return item.sentBytes
}

/**
 * The ring of the measured share while a file uploads, the spinner before
 * the first measurement, or the alert of a failed upload.
 */
function Glyph(props: { item: DraftFile }) {
  const theme = useSharedUiTheme()
  const { item } = props
  const sent = sentBytesOf(item)
  if (item.state === 'ready') return <KindIcon kind={item.attachment.kind} />
  if (item.state === 'failed') {
    return <CircleAlert aria-hidden className={states.failedIcon} size={13} />
  }
  if (sent !== null) {
    return (
      <span className={states.spinner}>
        <ProgressRing
          accessibilityLabel={uploadingLabel}
          color={theme.colors.primary}
          size={13}
          value={sent / item.file.size}
        />
      </span>
    )
  }
  return (
    <span className={states.spinner}>
      <Spinner
        accessibilityLabel={uploadingLabel}
        color={theme.colors.primary}
        size={13}
      />
    </span>
  )
}

/**
 * A file of a draft. Its glyph sits in a cell at its start, which a pointer
 * or the keyboard focus turns into a × that removes the file. Where no
 * pointer hovers, the glyph stays, and a × button of touch size ends the
 * file.
 */
function DraftChip(props: {
  item: DraftFile
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}) {
  const { item } = props
  const noHover = useNoHover()
  const failed = item.state === 'failed'
  const name = item.state === 'ready' ? item.attachment.name : item.file.name
  const sent = sentBytesOf(item)
  let label = uploadingLabel
  if (sent !== null) label = sentLabel(sent, item.file.size)
  if (item.state === 'ready') label = formatSize(item.attachment.sizeBytes)
  if (failed) label = failedLabel
  const remove = () => props.onRemove(item.id)
  return (
    <li
      className={classes(
        styles.chip,
        styles.removable,
        noHover && styles.withEnd,
        failed && states.failed,
      )}
    >
      <ChipIconCell
        focusable
        icon={<Glyph item={item} />}
        removal={{ name, onRemove: remove }}
      />
      <span className={styles.name}>{name}</span>
      <span className={classes(styles.size, failed && states.failedLabel)}>
        {label}
      </span>
      {failed ? (
        <ActionButton
          accessibilityLabel={`Upload ${name} again`}
          onPress={() => props.onRetry(item.id)}
          tone="plain"
        >
          {tryAgainLabel}
        </ActionButton>
      ) : null}
      {noHover ? (
        <IconButton icon={X} label={`Remove ${name}`} onPress={remove} quiet />
      ) : null}
    </li>
  )
}

/**
 * The files of a draft above the text. Each one shows its upload: a ring and
 * the measured percent, or a spinner and "Uploading" before the browser
 * measures it, Try again on a failed upload, or its size when it is ready.
 * Its × takes it off the draft. The chat and both New workspace forms draw
 * these chips.
 */
export function DraftFiles(props: {
  files: readonly DraftFile[]
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <ul aria-label="Attached files" className={styles.chips}>
      {props.files.map((item) => (
        <DraftChip
          item={item}
          key={item.id}
          onRemove={props.onRemove}
          onRetry={props.onRetry}
        />
      ))}
    </ul>
  )
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
