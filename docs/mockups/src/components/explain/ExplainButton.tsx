import { MessageSquareQuote } from 'lucide-react'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { Linked } from '../common/ScreenLink'
import { useTouch } from '../../../../../src/ui/components/common/touch'
import { explainLabel } from '../../../../../src/ui/components/explain/explainCopy'
import styles from '../../../../../src/ui/components/explain/ExplainButton.module.css'

/**
 * Where the button by a selection lines up: `middle` over the middle of
 * the selection, or `end` over the end of the selection, where the chat
 * has no room past it, such as in a message bubble at the right of the
 * chat.
 */
export type ByAlign = 'middle' | 'end'

/**
 * Explain, by a finished selection inside one message, on a computer. It
 * floats just above the selection, at its middle, as the selection tools of
 * most editors do. So it covers none of the text that the member reads
 * next. Tab reaches it from the selection. A press sends the prompt that
 * the app writes, and the popover of the explanation opens by the text.
 */
export function ExplainButton(props: { to?: string; align: ByAlign }) {
  return (
    <span className={classes(styles.float, styles.above, styles[props.align])}>
      <Linked to={props.to}>
        <ActionButton icon={MessageSquareQuote}>{explainLabel}</ActionButton>
      </Linked>
    </span>
  )
}

/**
 * Explain on a phone, above the composer. The phone shows its own selection
 * menu above the selection, and its handles at the ends, so the button
 * stays away from them. A computer shows it by the selection, so it draws
 * nothing here.
 */
export function PhoneExplainButton(props: { to?: string }) {
  if (!useTouch()) return null
  return (
    <div className={styles.phoneRow}>
      <span className={classes(styles.float, styles.phoneFloat)}>
        <Linked to={props.to}>
          <ActionButton icon={MessageSquareQuote}>{explainLabel}</ActionButton>
        </Linked>
      </span>
    </div>
  )
}
