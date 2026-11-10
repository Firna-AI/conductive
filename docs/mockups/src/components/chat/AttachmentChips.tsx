import { ProgressRing } from '@firna/ui/loader'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, FileText, ImageIcon, X } from 'lucide-react'
import type { Attachment } from '../../fixtures/attachments'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { ActionButton, IconButton } from '../common/actions'
import {
  failedLabel,
  sentLabel,
  tryAgainLabel,
  uploadingLabel,
} from './attachmentCopy'
import { ChipIconCell, useNoHover } from './ChipRemove'
import { formatSize } from './sizes'
import styles from './AttachmentChips.module.css'
import states from './AttachmentStates.module.css'

/** The share of an upload that the browser measured, or none. */
function measured(file: Attachment): number | null {
  if (file.state !== 'uploading' || file.sentBytes === undefined) return null
  return file.sizeBytes > 0 ? file.sentBytes : null
}

/**
 * The glyph of a file: a ring with the measured share while its upload
 * runs, a spinner before the first measurement, an alert when the upload
 * failed, or the kind of the file.
 */
function Glyph(props: { file: Attachment }) {
  const theme = useSharedUiTheme()
  const { file } = props
  const sent = measured(file)
  if (sent !== null) {
    return (
      <span className={states.spinner}>
        <ProgressRing
          accessibilityLabel={uploadingLabel}
          color={theme.colors.primary}
          size={13}
          value={sent / file.sizeBytes}
        />
      </span>
    )
  }
  if (file.state === 'uploading') {
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
  if (file.state === 'failed') {
    return <CircleAlert aria-hidden className={states.failedIcon} size={13} />
  }
  const Icon = file.kind === 'image' ? ImageIcon : FileText
  return <Icon aria-hidden className={styles.icon} size={13} />
}

/** The label after the name: the state of the upload, or the size. */
function label(file: Attachment): string {
  const sent = measured(file)
  if (sent !== null) return sentLabel(sent, file.sizeBytes)
  if (file.state === 'uploading') return uploadingLabel
  if (file.state === 'failed') return failedLabel
  return formatSize(file.sizeBytes)
}

/**
 * A file of the message. In the composer its glyph sits in the cell that
 * removes it, and where no pointer hovers, the × button of touch size ends
 * it. A file of a sent message only shows its glyph.
 */
function Chip(props: { file: Attachment; sent: boolean; pointer: boolean }) {
  const { file, sent } = props
  const noHover = useNoHover()
  const failed = file.state === 'failed'
  return (
    <li
      className={classes(
        styles.chip,
        failed && states.failed,
        sent ? states.fixed : styles.removable,
        !sent && noHover && styles.withEnd,
      )}
    >
      {sent ? (
        <Glyph file={file} />
      ) : (
        <ChipIconCell
          focusable
          icon={<Glyph file={file} />}
          removal={{ name: file.name, pointer: props.pointer }}
        />
      )}
      <span className={styles.name}>{file.name}</span>
      <span className={classes(styles.size, failed && states.failedLabel)}>
        {label(file)}
      </span>
      {failed ? (
        // The mockups draw one failed upload. Try again leads to its upload.
        <ScreenLink asChild to={paths.attachments}>
          <ActionButton
            accessibilityLabel={`Upload ${file.name} again`}
            tone="plain"
          >
            {tryAgainLabel}
          </ActionButton>
        </ScreenLink>
      ) : null}
      {!sent && noHover ? (
        <IconButton icon={X} label={`Remove ${file.name}`} quiet />
      ) : null}
    </li>
  )
}

/**
 * The files of a message. In the composer each file shows its upload: a
 * spinner while it runs, Try again when it failed, or the size when the
 * file is uploaded. The cell of its glyph turns into a × under a pointer or
 * the keyboard focus, and the × takes the file off the message. It also
 * stops an upload that runs. A view has no pointer, so `pointer` names the
 * file that it draws with the pointer over its glyph. Under a sent message
 * the files only show, at the right.
 */
export function AttachmentChips(props: {
  attachments: readonly Attachment[]
  pointer?: string
  sent?: boolean
}) {
  const sent = props.sent === true
  return (
    <ul
      aria-label="Attached files"
      className={classes(styles.chips, sent && states.sent)}
    >
      {props.attachments.map((file) => (
        <Chip
          file={file}
          key={file.name}
          pointer={props.pointer === file.name}
          sent={sent}
        />
      ))}
    </ul>
  )
}
