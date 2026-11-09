import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import styles from './ChipRemove.module.css'

/**
 * How a chip of the composer can go (decision 215). `name` names the chip
 * in the button "Remove <name>". A view runs no script and has no pointer,
 * so `pointer` draws the chip with the pointer over its icon.
 */
export type ChipRemoval = {
  name: string
  pointer?: boolean
}

/** Whether no pointer hovers here: the phone views of the mockups. */
export function useNoHover(): boolean {
  return useControlSizes().field === 'lg'
}

/**
 * The icon of a chip of the composer, in a cell at the start of the chip.
 * While a pointer is over the cell, a × takes the place of the icon, and a
 * press on it removes the chip. A keyboard can reach the cell only where
 * `focusable` says so, as for an attached file. In the text a keyboard
 * removes a chip with Backspace. Where no pointer hovers, the cell keeps
 * its icon, and the × follows the chip (decision 217).
 */
export function ChipIconCell(props: {
  icon: ReactNode
  removal: ChipRemoval
  focusable?: boolean
}) {
  const noHover = useNoHover()
  if (noHover) {
    return (
      <span className={classes(styles.cell, styles.still)}>{props.icon}</span>
    )
  }
  return (
    <button
      aria-label={`Remove ${props.removal.name}`}
      className={classes(
        styles.cell,
        styles.remove,
        props.removal.pointer && styles.pointer,
      )}
      tabIndex={props.focusable ? 0 : -1}
      type="button"
    >
      <span className={styles.icon}>{props.icon}</span>
      <X aria-hidden className={styles.x} size={12} strokeWidth={2.25} />
    </button>
  )
}

/**
 * The × at the end of a chip of the composer, where no pointer hovers, as
 * on a phone (decision 217). It shows at all times.
 */
export function ChipEndRemove(props: { removal: ChipRemoval }) {
  if (!useNoHover()) return null
  return (
    <button
      aria-label={`Remove ${props.removal.name}`}
      className={styles.end}
      type="button"
    >
      <X aria-hidden size={14} />
    </button>
  )
}
