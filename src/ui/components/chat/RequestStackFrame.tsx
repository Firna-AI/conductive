import type { FocusEventHandler, ReactNode } from 'react'
import { classes } from '../common/classes'
import { stackPlace } from './requestStackCopy'
import { secretRunWords } from './secretRunCopy'
import styles from './RequestStack.module.css'

/**
 * The stack of the open requests of a session, just above the composer,
 * around the card on top. With more than one card, the place of the card
 * on top, such as "1 of 3", then Previous and Next sit above it, and the
 * edges of at most two other cards show behind it. One card shows no
 * place, no buttons, and no edges. The place is a polite live region, so a
 * screen reader hears the new place after a move. The stack takes at most
 * 40% of the window and draws the outline of the card on top, so a long
 * card scrolls inside it, and an edge that cuts the card fades. The caller
 * draws the card in its stacked form, and Previous and Next: the app with
 * presses, and the mockups with links to their pages.
 */
export function RequestStackFrame(props: {
  /** The number of cards of the stack, at least one. */
  count: number
  /** The place of the card on top, from 1. */
  place: number
  /** Previous, which is off on the first card. */
  previous: ReactNode
  /** Next, which is off on the last card. */
  next: ReactNode
  /** The card on top. */
  children: ReactNode
  /** Names the card on top. A new name starts the new card at its top. */
  cardKey?: string
  /** A part after the stack, such as a menu that a mockup draws open. */
  after?: ReactNode
  onFocus?: FocusEventHandler<HTMLDivElement>
  onBlur?: FocusEventHandler<HTMLDivElement>
}) {
  const { count, place } = props
  const behind = Math.min(count - 1, 2)
  return (
    <div
      aria-label={secretRunWords.region}
      className={styles.stack}
      onBlur={props.onBlur}
      onFocus={props.onFocus}
      role="group"
    >
      {count > 1 ? (
        <div className={styles.steps}>
          <span aria-atomic aria-live="polite" className={styles.place}>
            {stackPlace(place, count)}
          </span>
          {props.previous}
          {props.next}
        </div>
      ) : null}
      <div
        className={classes(
          styles.deck,
          behind === 1 && styles.oneBehind,
          behind === 2 && styles.twoBehind,
        )}
      >
        {behind === 2 ? <span aria-hidden className={styles.far} /> : null}
        {behind > 0 ? <span aria-hidden className={styles.near} /> : null}
        <div className={styles.card}>
          <div className={styles.scroll} key={props.cardKey}>
            {props.children}
          </div>
        </div>
      </div>
      {props.after}
    </div>
  )
}
