import type { ReactNode } from 'react'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { useTouch } from '../common/touch'
import { MarkGlyph } from './MarkGlyph'
import { PhoneSelectionEnd, PhoneSelectionStart } from './PhoneSelection'
import type { MessageMarks, TextMark, TextSpan } from './chatMarks'
import { markLabel } from './sideQuestionCopy'
import styles from './SideText.module.css'

type Placed = { span: TextSpan; start: number; end: number }

/** A run of the text that the same spans cover. */
type Segment = {
  text: string
  covers: readonly Placed[]
  starts: readonly Placed[]
  ends: readonly Placed[]
}

/** Each span whose quote the text holds, at its first place in the text. */
function placeSpans(text: string, spans: readonly TextSpan[]): Placed[] {
  return spans.flatMap((span) => {
    const start = text.indexOf(span.quote)
    return start < 0 ? [] : [{ span, start, end: start + span.quote.length }]
  })
}

/** The text cut at each start and end of a span. */
function segmentsOf(text: string, spans: readonly Placed[]): Segment[] {
  const cuts = [
    ...new Set([0, text.length, ...spans.flatMap((p) => [p.start, p.end])]),
  ].sort((a, b) => a - b)
  return cuts.slice(1).map((to, index) => {
    const from = cuts[index]
    return {
      text: text.slice(from, to),
      covers: spans.filter((p) => p.start <= from && p.end >= to),
      starts: spans.filter((p) => p.start === from),
      ends: spans.filter((p) => p.end === to),
    }
  })
}

function marksIn(placed: readonly Placed[]): TextMark[] {
  return placed.flatMap((p) => (p.span.kind === 'mark' ? [p.span.mark] : []))
}

function selectionIn(placed: readonly Placed[]) {
  for (const p of placed) if (p.span.kind === 'selection') return p.span
  return undefined
}

/** A part of a mark: a link to the overlay of its session, when drawn. */
function MarkPart(props: {
  className: string
  title: string
  to?: string
  children: ReactNode
}) {
  const { className, title, to } = props
  if (to === undefined) {
    return (
      <span className={className} title={title}>
        {props.children}
      </span>
    )
  }
  return (
    <ScreenLink className={className} title={title} to={to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * The end of a mark: the state of its session, and for screen readers its
 * title and its state in words.
 */
function MarkEnd(props: { mark: TextMark }) {
  const { title, state } = props.mark
  const spoken = ` (${markLabel(title, state)})`
  return (
    <>
      <MarkGlyph state={state} />
      <span className={a11y.hidden}>{spoken}</span>
    </>
  )
}

/**
 * One run of the text with its spans. Each mark that ends here shows the
 * state of its session, and screen readers hear its title and its state.
 * Where marks overlap, the run opens their menu, which a computer draws
 * below it when it is open, and a phone in a sheet.
 */
function SegmentView(props: {
  segment: Segment
  overlap?: MessageMarks['overlap']
  /** The open menu of the overlap hangs from this run, its first. */
  menuHere: boolean
  render: (text: string) => ReactNode
}) {
  const touch = useTouch()
  const { segment, overlap } = props
  const marks = marksIn(segment.covers)
  const ending = marksIn(segment.ends).map((mark) => (
    <MarkEnd key={mark.key} mark={mark} />
  ))
  let content: ReactNode = (
    <>
      {props.render(segment.text)}
      {ending}
    </>
  )
  if (marks.length === 1) {
    const [mark] = marks
    content = (
      <MarkPart
        className={classes(styles.mark, mark.active && styles.active)}
        title={mark.title}
        to={mark.to}
      >
        {content}
      </MarkPart>
    )
  } else if (marks.length > 1) {
    const title = marks.map((mark) => mark.title).join('\n')
    const menu = overlap?.menu
    content = menu ? (
      <span className={classes(styles.mark, styles.overlap, styles.menuOpen)}>
        {content}
        {props.menuHere && !touch ? menu : null}
      </span>
    ) : (
      <MarkPart
        className={classes(styles.mark, styles.overlap)}
        title={title}
        to={overlap?.to}
      >
        {content}
      </MarkPart>
    )
  }
  const selection = selectionIn(segment.covers)
  if (selection) content = <span className={styles.selection}>{content}</span>
  const starts = selectionIn(segment.starts)
  const ends = selectionIn(segment.ends)
  return (
    <>
      {starts?.system && touch ? <PhoneSelectionStart /> : null}
      {content}
      {ends?.system && touch ? <PhoneSelectionEnd /> : null}
    </>
  )
}

/**
 * The runs of a selection in one box, so that what a computer shows by the
 * selection, the button or the prompt field, can place itself against the
 * whole selection: above its middle, or under its end.
 */
function SelectionBox(props: { by?: ReactNode; children: ReactNode }) {
  const touch = useTouch()
  return (
    <span className={styles.selected}>
      {props.children}
      {props.by && !touch ? props.by : null}
    </span>
  )
}

/**
 * A text of a message with its marks and its selection. `render` draws a
 * run of the text, as the message draws its text. The text is cut only at
 * the ends of the spans, so a quote holds whole code and whole bold.
 */
export function SideText(props: {
  text: string
  marks: MessageMarks
  render: (text: string) => ReactNode
}) {
  const spans = placeSpans(props.text, props.marks.spans)
  if (spans.length === 0) return props.render(props.text)
  const segments = segmentsOf(props.text, spans)
  const overlapAt = segments.findIndex((s) => marksIn(s.covers).length > 1)
  const views = segments.map((segment, index) => (
    <SegmentView
      key={index}
      menuHere={index === overlapAt}
      overlap={props.marks.overlap}
      render={props.render}
      segment={segment}
    />
  ))
  const selected = segments.flatMap((segment, index) =>
    selectionIn(segment.covers) ? [index] : [],
  )
  if (selected.length === 0) return views
  const first = selected[0]
  const last = selected[selected.length - 1]
  const selection = selectionIn(segments[first].covers)
  return (
    <>
      {views.slice(0, first)}
      <SelectionBox by={selection?.by}>
        {views.slice(first, last + 1)}
      </SelectionBox>
      {views.slice(last + 1)}
    </>
  )
}
