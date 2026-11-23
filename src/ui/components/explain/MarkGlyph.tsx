import { Spinner } from '@firna/ui/spinner'
import { CircleAlert, MessageSquareQuote } from 'lucide-react'
import { classes } from '../common/classes'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import type { ExplainMarkState } from './explainCopy'
import styles from './MarkedText.module.css'

/**
 * The run state of an explanation, at the end of its mark and in the menu
 * of overlapping marks. Each state has its own shape: the icon of Explain
 * when its turn ended, the spinner of a session tab while it runs, the
 * Needs input mark of the header while it waits for a member, and the alert
 * of a failed turn, in the danger colour, when its turn failed. The mark
 * says the state in words, so screen readers skip the glyph.
 */
export function MarkGlyph(props: { state: ExplainMarkState }) {
  switch (props.state) {
    case 'idle':
      return (
        <span aria-hidden className={styles.glyph}>
          <MessageSquareQuote size={12} />
        </span>
      )
    case 'running':
      return (
        <span aria-hidden className={styles.glyph}>
          <Spinner color="currentColor" size={11} />
        </span>
      )
    case 'waiting':
      return (
        <span aria-hidden className={styles.glyph}>
          <StatusGlyph status="input" />
        </span>
      )
    case 'failed':
      return (
        <span aria-hidden className={classes(styles.glyph, styles.failed)}>
          <CircleAlert size={12} />
        </span>
      )
  }
}
