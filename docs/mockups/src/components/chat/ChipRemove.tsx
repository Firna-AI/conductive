import { useSyncExternalStore, type MouseEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import styles from './ChipRemove.module.css'

/**
 * How a chip of the composer can go. `name` names the chip
 * in the button "Remove <name>". A view runs no script and has no pointer,
 * so `pointer` draws the chip with the pointer over its icon. The app gives
 * `onRemove`, which removes the chip.
 */
export type ChipRemoval = {
  name: string
  pointer?: boolean
  onRemove?: () => void
}

/** A device whose main pointer cannot hover, such as a touch screen. */
const noHoverQuery = '(hover: none)'

function canMatch(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  )
}

function subscribe(listener: () => void): () => void {
  if (!canMatch()) return () => undefined
  const query = window.matchMedia(noHoverQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function snapshot(): boolean {
  return canMatch() && window.matchMedia(noHoverQuery).matches
}

/**
 * Whether no pointer hovers here: the phone layout, or a device whose main
 * pointer cannot hover, such as a tablet in the desktop layout. A view of
 * the mockups has no window, so only its phone layout counts.
 */
export function useNoHover(): boolean {
  const touch = useControlSizes().field === 'lg'
  const noHover = useSyncExternalStore(subscribe, snapshot, () => false)
  return touch || noHover
}

/**
 * A press on a button inside the text takes no focus, so the focus and the
 * caret stay where they were: in the field when it had the focus.
 */
function keepCaret(event: MouseEvent) {
  event.preventDefault()
}

/**
 * The icon of a chip of the composer, in a cell at the start of the chip.
 * While a pointer is over the cell, a × takes the place of the icon, and a
 * press on it removes the chip. A keyboard can reach the cell only where
 * `focusable` says so, as for an attached file. In the text a keyboard
 * removes a chip with Backspace. Where no pointer hovers, the cell keeps
 * its icon, and the × follows the chip.
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
      onClick={props.removal.onRemove}
      onMouseDown={props.focusable ? undefined : keepCaret}
      tabIndex={props.focusable ? 0 : -1}
      type="button"
    >
      <span className={styles.icon}>{props.icon}</span>
      <X aria-hidden className={styles.x} size={12} strokeWidth={2.25} />
    </button>
  )
}

/**
 * The × at the end of a chip in the text, where no pointer hovers, as on a
 * phone. It shows at all times.
 */
export function ChipEndRemove(props: { removal: ChipRemoval }) {
  if (!useNoHover()) return null
  return (
    <button
      aria-label={`Remove ${props.removal.name}`}
      className={styles.end}
      onClick={props.removal.onRemove}
      onMouseDown={keepCaret}
      tabIndex={-1}
      type="button"
    >
      <X aria-hidden size={14} />
    </button>
  )
}
