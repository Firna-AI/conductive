import { ImageIcon, X } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/AttachmentChips.module.css'
import {
  ChipIconCell,
  useNoHover,
} from '../../../docs/mockups/src/components/chat/ChipRemove'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { screenshotsLabel } from '../../../docs/mockups/src/components/feedback/feedbackCopy'
import type { FeedbackDraftScreenshot } from '../../app/feedback-state'
import { IconButton } from '../ui/actions'

/**
 * One screenshot of the draft: its name and its size, as the chip of an
 * attached file shows them. Its icon sits in a cell that a pointer or the
 * keyboard focus turns into a × that removes it. Where no pointer hovers,
 * the icon stays, and a × button of touch size ends the chip.
 */
function ScreenshotChip(props: {
  screenshot: FeedbackDraftScreenshot
  onRemove: (id: string) => void
}) {
  const { screenshot } = props
  const noHover = useNoHover()
  const remove = () => props.onRemove(screenshot.id)
  return (
    <li
      className={classes(
        styles.chip,
        styles.removable,
        noHover && styles.withEnd,
      )}
    >
      <ChipIconCell
        focusable
        icon={<ImageIcon aria-hidden className={styles.icon} size={13} />}
        removal={{ name: screenshot.name, onRemove: remove }}
      />
      <span className={styles.name}>{screenshot.name}</span>
      <span className={styles.size}>{formatSize(screenshot.sizeBytes)}</span>
      {noHover ? (
        <IconButton
          icon={X}
          label={`Remove ${screenshot.name}`}
          onPress={remove}
          quiet
        />
      ) : null}
    </li>
  )
}

/** The screenshots of the feedback draft, above its text, as chips. */
export function ScreenshotChips(props: {
  screenshots: readonly FeedbackDraftScreenshot[]
  onRemove: (id: string) => void
}) {
  return (
    <ul aria-label={screenshotsLabel} className={styles.chips}>
      {props.screenshots.map((screenshot) => (
        <ScreenshotChip
          key={screenshot.id}
          onRemove={props.onRemove}
          screenshot={screenshot}
        />
      ))}
    </ul>
  )
}
