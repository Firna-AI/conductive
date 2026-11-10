import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ScreenLink } from '../../common/ScreenLink'
import { classes } from '../../common/classes'
import type { DocsGuide } from './docsGuides'
import styles from './DocsPager.module.css'

/**
 * The link to a neighbouring guide. A guide that the mockups do not draw
 * keeps its place and its look, without a link.
 */
function Neighbour(props: {
  guide: DocsGuide
  direction: 'previous' | 'next'
}) {
  const { guide } = props
  const next = props.direction === 'next'
  const className = classes(styles.card, next && styles.next)
  const content = (
    <>
      <span className={styles.direction}>
        {next ? null : <ArrowLeft aria-hidden size={13} />}
        {next ? 'Next' : 'Previous'}
        {next ? <ArrowRight aria-hidden size={13} /> : null}
      </span>
      <span className={styles.title}>{guide.title}</span>
    </>
  )
  if (!guide.to) return <div className={className}>{content}</div>
  return (
    <ScreenLink className={className} to={guide.to}>
      {content}
    </ScreenLink>
  )
}

/**
 * The previous and the next guide in the order of the menu, at the foot of
 * a page. `stack` puts them under each other, as on a phone.
 */
export function DocsPager(props: {
  previous?: DocsGuide
  next?: DocsGuide
  stack?: boolean
}) {
  return (
    <nav
      aria-label="Previous and next guides"
      className={classes(styles.pager, props.stack && styles.stack)}
    >
      {props.previous ? (
        <Neighbour direction="previous" guide={props.previous} />
      ) : null}
      {props.next ? <Neighbour direction="next" guide={props.next} /> : null}
    </nav>
  )
}
