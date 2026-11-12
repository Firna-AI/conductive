import { ImageIcon, X } from 'lucide-react'
import type { FeedbackScreenshot } from '../../fixtures/feedback'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { ChipIconCell, useNoHover } from '../chat/ChipRemove'
import { formatSize } from '../chat/sizes'
import styles from '../chat/AttachmentChips.module.css'
import { screenshotsLabel } from './feedbackCopy'

/**
 * One screenshot of the draft: its name and its size, as the chip of an
 * attached file shows them. Its icon sits in a cell that a pointer or the
 * keyboard focus turns into a × that removes it. Where no pointer hovers,
 * the icon stays, and a × button of touch size ends the chip.
 */
function ScreenshotChip(props: { screenshot: FeedbackScreenshot }) {
  const { screenshot } = props
  const noHover = useNoHover()
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
        removal={{ name: screenshot.name }}
      />
      <span className={styles.name}>{screenshot.name}</span>
      <span className={styles.size}>{formatSize(screenshot.sizeBytes)}</span>
      {noHover ? (
        <IconButton icon={X} label={`Remove ${screenshot.name}`} quiet />
      ) : null}
    </li>
  )
}

/**
 * The screenshots of the feedback draft, above its text, as a row of
 * chips. Feedback keeps this row, while each composer of a chat puts its
 * files into the text. The dialog sends each screenshot with the message,
 * so a chip has no upload state.
 */
export function ScreenshotRow(props: {
  screenshots: readonly FeedbackScreenshot[]
}) {
  return (
    <ul aria-label={screenshotsLabel} className={styles.chips}>
      {props.screenshots.map((screenshot) => (
        <ScreenshotChip key={screenshot.name} screenshot={screenshot} />
      ))}
    </ul>
  )
}
