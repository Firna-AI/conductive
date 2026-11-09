import { Button } from '@firna/ui/button'
import { Check, Link2 } from 'lucide-react'
import { noop } from '../../noop'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import styles from './CopyLinkButton.module.css'

/** The result of the last press, which the button shows for a moment. */
export type CopyResult = 'copied' | 'failed'

/** The words of the note under the button, for each result. */
export const copyNotes: Readonly<Record<CopyResult, string>> = {
  copied: 'Link copied',
  failed: "The link didn't copy. Try again.",
}

/**
 * A button in the line under the name of a phone header. It draws 21 px
 * high, and its touch area grows 15 px up over the name and 8 px down to
 * the bottom edge of the header: 44 px, over no other control. It moves
 * 4 px to the left, so its icon lines up with the name.
 */
const inLine = {
  touchArea: { top: 15, bottom: 8 },
  style: { marginLeft: -4, paddingHorizontal: 4 },
}

/**
 * The label of the workspace number, such as `W-395`, as the button that
 * copies the web address of the workspace. A link icon leads the label.
 * After a press, a note under the button gives the result for a moment.
 * When the copy worked, a check takes the place of the icon, and the note
 * says "Link copied". When it failed, the icon stays, and the note in the
 * danger colour asks the user to try again. The note is a status, so
 * screen readers hear it, and it lies over the content under the button,
 * so nothing moves.
 */
export function CopyLinkButton(props: {
  /** The label of the number, such as `W-395`. */
  label: string
  /** The result of the last press, while the button shows it. */
  result?: CopyResult
  /**
   * The button sits in the line under the name, as on a phone. It keeps the
   * height of that line, and its touch area is 44 px high.
   */
  inline?: boolean
  onPress?: () => void
}) {
  const control = useControlSizes()
  const copied = props.result === 'copied'
  const Icon = copied ? Check : Link2
  const note = props.result
    ? classes(styles.note, props.result === 'failed' && styles.failed)
    : a11y.hidden
  return (
    <span className={styles.anchor}>
      <Button
        accessibilityLabel={`Copy link to ${props.label}`}
        content={
          <span className={styles.content}>
            <Icon
              aria-hidden
              className={copied ? styles.done : styles.icon}
              size={12}
            />
            <span className={styles.label}>{props.label}</span>
          </span>
        }
        hitSlop={props.inline ? inLine.touchArea : undefined}
        inline={props.inline}
        onPress={props.onPress ?? noop}
        size="sm"
        style={
          props.inline
            ? inLine.style
            : { height: control.height, paddingHorizontal: 6 }
        }
        tone="plain"
      />
      <span className={note} role="status">
        {props.result ? copyNotes[props.result] : null}
      </span>
    </span>
  )
}
