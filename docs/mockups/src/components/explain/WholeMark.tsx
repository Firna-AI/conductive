import type { ReactNode } from 'react'
import { ScreenLink } from '../common/ScreenLink'
import type { TextMark } from './chatMarks'
import { MarkGlyph } from '../../../../../src/ui/components/explain/MarkGlyph'
import { markLabel } from '../../../../../src/ui/components/explain/explainCopy'
import styles from '../../../../../src/ui/components/explain/MarkedText.module.css'

/**
 * A message whose mark covers it whole, because the text of the mark no
 * longer matches. The message takes the fill of a mark, and the state of
 * its explanation at the top right opens the popover of the explanation.
 */
export function WholeMark(props: { mark?: TextMark; children: ReactNode }) {
  const { mark } = props
  if (mark === undefined) return props.children
  const label = markLabel(mark.title, mark.state)
  const glyph = <MarkGlyph state={mark.state} />
  return (
    <div className={styles.whole} title={mark.title}>
      {props.children}
      {mark.to ? (
        <ScreenLink
          aria-label={label}
          className={styles.wholeGlyph}
          to={mark.to}
        >
          {glyph}
        </ScreenLink>
      ) : (
        <span aria-label={label} className={styles.wholeGlyph} role="img">
          {glyph}
        </span>
      )}
    </div>
  )
}
