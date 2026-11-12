import type { RefCallback } from 'react'
import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import styles from './CopyLinkButton.module.css'

/** The result of the last press, which the button shows for a moment. */
export type CopyResult = 'copied' | 'failed'

/** The words of the note under the button, for each result. */
const copyNotes: Readonly<Record<CopyResult, string>> = {
  copied: 'Link copied',
  failed: "The link didn't copy. Try again.",
}

/**
 * A button in the line under the name of a phone header. It draws 21 px
 * high, and its touch area grows 15 px up over the name and 8 px down to
 * the bottom edge of the header: 44 px, over no other control. The touch
 * area starts inside the 1 px border of the button, so each inset is 1 px
 * larger. The button moves 4 px to the left, so its label lines up with
 * the name.
 */
const inLine = {
  touchArea: { top: 16, bottom: 9 },
  style: { marginLeft: -4, paddingHorizontal: 4 },
}

/**
 * The label of the workspace number, such as `W-395`, as the button that
 * copies the web address of the workspace. The label shows alone, without
 * an icon. It is a plain Firna button, so a pointer over it shows the hover
 * fill of the plain buttons, and the keyboard focus shows the focus ring.
 * After a press, a note under the button gives the result for a moment:
 * "Link copied", or a request to try again in the danger colour. The note
 * is a status, so screen readers hear it, and it lies over the content
 * under the button, so nothing moves.
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
  /**
   * The ref of the button, so that the app can name the key of Copy link
   * on it for a screen reader, as `aria-keyshortcuts`.
   */
  buttonRef?: RefCallback<unknown>
}) {
  const control = useControlSizes()
  const note = props.result
    ? classes(styles.note, props.result === 'failed' && styles.failed)
    : a11y.hidden
  return (
    <span className={styles.anchor}>
      <Button
        accessibilityLabel={`Copy link to ${props.label}`}
        buttonRef={props.buttonRef}
        content={<span className={styles.label}>{props.label}</span>}
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
