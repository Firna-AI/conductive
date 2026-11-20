import { Spinner } from '@firna/ui/spinner'
import { MessageSquareQuote } from 'lucide-react'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import type { SideMarkState } from './sideQuestionCopy'
import styles from './SideText.module.css'

/**
 * The run state of a side session, at the end of its mark and in the menu
 * of overlapping marks. Each state has its own shape: the icon of Ask about
 * this while the turn has ended, the spinner of a session tab while it
 * runs, and the Needs input mark of the header while it waits for a
 * member. The mark says the state in words, so screen readers skip the
 * glyph.
 */
export function MarkGlyph(props: { state: SideMarkState }) {
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
  }
}
