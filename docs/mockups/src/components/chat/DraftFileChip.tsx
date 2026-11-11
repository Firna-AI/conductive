import { ProgressRing } from '@firna/ui/loader'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert } from 'lucide-react'
import { classes } from '../common/classes'
import { AttachedName, KindIcon, type ChipFile } from './attachedFileParts'
import {
  failedLabel,
  sentLabel,
  tryAgainLabel,
  uploadingLabel,
} from './attachmentCopy'
import { ChipEndRemove, ChipIconCell, type ChipRemoval } from './ChipRemove'
import { formatSize } from './sizes'
import { useChipClass } from './WorkspaceChip'
import styles from './AttachedFileChip.module.css'

/**
 * The upload of a file of a draft: uploaded, running, or failed. While it
 * runs, `sentBytes` holds the bytes that the browser measured as sent, or
 * null before the first measurement.
 */
export type ChipUpload =
  | { state: 'ready' }
  | { state: 'uploading'; sentBytes: number | null }
  | { state: 'failed' }

/** The bytes that the browser measured, or null. An empty file has no share. */
function measured(file: ChipFile, upload: ChipUpload): number | null {
  if (upload.state !== 'uploading' || file.sizeBytes === 0) return null
  return upload.sentBytes
}

/**
 * The glyph of the chip: a ring with the measured share while the upload
 * runs, a spinner before the first measurement, an alert when the upload
 * failed, or the kind of the file.
 */
function Glyph(props: { file: ChipFile; upload: ChipUpload }) {
  const theme = useSharedUiTheme()
  const { file, upload } = props
  const sent = measured(file, upload)
  if (sent !== null) {
    return (
      <ProgressRing
        accessibilityLabel={uploadingLabel}
        color={theme.colors.primary}
        size={12}
        value={sent / file.sizeBytes}
      />
    )
  }
  if (upload.state === 'uploading') {
    return (
      <Spinner
        accessibilityLabel={uploadingLabel}
        color={theme.colors.primary}
        size={12}
      />
    )
  }
  if (upload.state === 'failed') {
    return <CircleAlert aria-hidden className={styles.failedIcon} size={12} />
  }
  return <KindIcon kind={file.kind} size={12} />
}

/** The label after the name: the state of the upload, or the size. */
function label(file: ChipFile, upload: ChipUpload): string {
  const sent = measured(file, upload)
  if (sent !== null) return sentLabel(sent, file.sizeBytes)
  if (upload.state === 'uploading') return uploadingLabel
  if (upload.state === 'failed') return failedLabel
  return formatSize(file.sizeBytes)
}

/**
 * An attached file in the text of a message box: one unit of the text, as
 * a file chip is, with the size of a file chip. Its icon cell shows the
 * kind of the file, the upload ring, the spinner, or the failed mark. Then
 * come the name and a muted label: the share that uploaded, "Uploading",
 * the size, or "Failed". A failed chip offers Try again, which takes the
 * keyboard focus, and `onRetry` uploads the same file again.
 *
 * Under a pointer, a × takes the place of the glyph, and a press removes
 * the chip. Where no pointer hovers, a × ends the chip. A press on the name
 * opens nothing, because the cloud computer gets the file only when the
 * turn of its message starts. It takes no fixtures, so the app can draw it.
 */
export function DraftFileChip(props: {
  file: ChipFile
  upload: ChipUpload
  removal: ChipRemoval
  onRetry?: () => void
}) {
  const { file, upload, removal } = props
  const failed = upload.state === 'failed'
  const className = useChipClass(removal)
  const glyph = (
    <span className={styles.glyph}>
      <Glyph file={file} upload={upload} />
    </span>
  )
  return (
    <span
      className={classes(className, failed && styles.failed)}
      title={file.name}
    >
      <ChipIconCell icon={glyph} removal={removal} />
      <AttachedName name={file.name} />
      <span className={classes(styles.label, failed && styles.failedLabel)}>
        {label(file, upload)}
      </span>
      {failed ? (
        <button
          aria-label={`Upload ${file.name} again`}
          className={styles.retry}
          onClick={props.onRetry}
          type="button"
        >
          {tryAgainLabel}
        </button>
      ) : null}
      <ChipEndRemove removal={removal} />
    </span>
  )
}
