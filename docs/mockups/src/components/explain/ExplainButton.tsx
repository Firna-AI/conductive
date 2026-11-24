import { MessageCircleQuestionMark, MessageSquareQuote } from 'lucide-react'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { Linked } from '../common/ScreenLink'
import { useTouch } from '../../../../../src/ui/components/common/touch'
import {
  askLabel,
  explainLabel,
} from '../../../../../src/ui/components/explain/explainCopy'
import styles from '../../../../../src/ui/components/explain/ExplainButton.module.css'

/**
 * Where the bar by a selection lines up: `middle` over the middle of the
 * selection, or `end` over the end of the selection, where the chat has no
 * room past it, such as in a message bubble at the right of the chat.
 */
export type ByAlign = 'middle' | 'end'

/** The screens that Explain and Ask show, when the mockups draw them. */
type BarLinks = { explainTo?: string; askTo?: string }

/**
 * The two actions of a selection, in the order of Tab. Explain sends the
 * prompt that the app writes at once, and the popover of the explanation
 * opens by the text. Ask opens the popover at once, with an empty field for
 * the question of the member, and starts nothing before Send. Ask has no
 * key of its own.
 */
function Actions(props: BarLinks) {
  return (
    <>
      <Linked to={props.explainTo}>
        <ActionButton icon={MessageSquareQuote} tone="plain">
          {explainLabel}
        </ActionButton>
      </Linked>
      <Linked to={props.askTo}>
        <ActionButton icon={MessageCircleQuestionMark} tone="plain">
          {askLabel}
        </ActionButton>
      </Linked>
    </>
  )
}

/**
 * Explain and Ask, by a finished selection inside one message, on a
 * computer. Their bar floats just above the selection, at its middle, as
 * the selection tools of most editors do. So it covers none of the text
 * that the member reads next. Tab reaches Explain from the selection, then
 * Ask.
 */
export function FloatingExplain(props: BarLinks & { align: ByAlign }) {
  return (
    <span
      className={classes(
        styles.float,
        styles.above,
        styles[props.align],
        styles.bar,
      )}
    >
      <Actions askTo={props.askTo} explainTo={props.explainTo} />
    </span>
  )
}

/**
 * Explain and Ask on a phone, above the composer. The phone shows its own
 * selection menu above the selection, and its handles at the ends, so the
 * bar stays away from them. A computer shows the bar by the selection, so
 * it draws nothing here.
 */
export function PhoneExplain(props: BarLinks) {
  if (!useTouch()) return null
  return (
    <div className={styles.phoneRow}>
      <span className={classes(styles.float, styles.phoneFloat, styles.bar)}>
        <Actions askTo={props.askTo} explainTo={props.explainTo} />
      </span>
    </div>
  )
}
