import type { ReactNode } from 'react'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import styles from './ChipTextField.module.css'

/**
 * The text field of a message box that holds chips inside its text: plain
 * text, with each chip as one unit of it. It has the font and the line
 * height of the plain text field, and the same least and most numbers of
 * lines. It grows with its text up to `maxLines`, then scrolls. On a phone
 * its text is larger, as in the plain field.
 */
export function ChipTextField(props: {
  /** The spoken name of the field, such as "Message". */
  label: string
  /** The least number of lines that the field shows. */
  lines: number
  /** The most lines that the field shows before its text scrolls. */
  maxLines: number
  children: ReactNode
}) {
  const { field } = useControlSizes()
  return (
    <div
      aria-label={props.label}
      aria-multiline
      className={classes(styles.field, field === 'lg' && styles.touch)}
      contentEditable
      role="textbox"
      style={{
        minHeight: `${props.lines}lh`,
        maxHeight: `${props.maxLines}lh`,
      }}
      suppressContentEditableWarning
    >
      {props.children}
    </div>
  )
}
