import {
  useContext,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { classes } from '../../ui/components/common/classes'
import marked from '../../ui/components/explain/MarkedText.module.css'
import { ExplainContext, type ExplainView } from './explain-context'
import type { Explanation } from './explanations'
import { FloatingExplain, type ExplainAlign } from './ExplainButton'
import styles from './explain.module.css'
import { AnchorBox, MarkButton, WholeMarks } from './MarkParts'
import { uiAttribute } from './mark-layout'
import { keepPopover } from './press-outside'
import { messageAttributes } from './selection'
import {
  markRegions,
  marksAt,
  overlapPoint,
  useMarkHighlights,
  useMarkHover,
  useMarks,
} from './useMarks'

const none: readonly Explanation[] = []

export interface MarkedMessageProps {
  /** The ID of the message, as the anchor of an explanation names it. */
  messageId: string
  /** The message is finished, so a selection in it shows Explain. */
  done: boolean
  /** Where Explain lines up with a selection, as `ExplainAlign` says. */
  align: ExplainAlign
  /** The message sits in a bubble, whose box a mark that covers it fills. */
  bubble?: boolean
  /** The message shows its text, such as an open message line. */
  shown?: boolean
  /**
   * A press on the text opens or closes the message, as on a message line.
   * So a mark that covers the whole message opens only from its state.
   */
  folds?: boolean
  children: ReactNode
}

/** A press that a part of the text keeps, such as a link or a button. */
const OWN_PRESS = `a[href], button, input, textarea, select, [${uiAttribute}]`

function Marked(props: MarkedMessageProps & { view: ExplainView }) {
  const { view } = props
  const root = useRef<HTMLDivElement>(null)
  const shown = props.shown ?? true
  const marks = shown ? (view.marks.get(props.messageId) ?? none) : none
  const layout = useMarks(root, marks, styles.slot)
  const regions = markRegions(layout, props.folds ?? false)
  const hover = useMarkHover(regions)
  useMarkHighlights(layout, hover.hovered, view.open)
  // A press on the text of a mark keeps the open popover, because its click
  // opens the popover or the menu of the mark.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (regions.length === 0 || !target || target.closest(OWN_PRESS)) return
    if (marksAt(regions, event.clientX, event.clientY).length > 0) {
      keepPopover(event.nativeEvent)
    }
  }
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (regions.length === 0 || !target || target.closest(OWN_PRESS)) return
    if (document.getSelection()?.isCollapsed === false) return
    const hits = marksAt(regions, event.clientX, event.clientY)
    if (hits.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    if (hits.length === 1) {
      view.openPopover(hits[0].id)
      return
    }
    view.openMenu(
      hits.map((mark) => mark.id),
      overlapPoint(layout.overlaps, event.clientX, event.clientY),
    )
  }
  // The layout keeps each mark as it was placed, so its newest state and
  // title come from the marks of this render.
  const newest = (mark: Explanation) =>
    marks.find((item) => item.id === mark.id) ?? mark
  const whole = layout.whole.map(newest)
  const placedOpen = layout.placed.find(({ mark }) => mark.id === view.open)
  const wholeOpen = whole.some((mark) => mark.id === view.open)
  const hovered = regions
    .filter(({ mark }) => hover.hovered.includes(mark.id))
    .map(({ mark }) => newest(mark))
  const titles = (hovered.length > 0 ? hovered : whole)
    .map((mark) => mark.title)
    .join('\n')
  const selection =
    view.selection?.messageId === props.messageId ? view.selection : null
  return (
    <div
      className={classes(
        styles.message,
        whole.length > 0 && marked.whole,
        whole.length > 0 && props.bubble && marked.wholeBubble,
        hovered.length > 0 && styles.pointing,
      )}
      onClickCapture={onClickCapture}
      onPointerDown={onPointerDown}
      onPointerLeave={hover.onPointerLeave}
      onPointerMove={hover.onPointerMove}
      ref={root}
      title={titles || undefined}
      {...{
        [messageAttributes.chat]: view.chat,
        [messageAttributes.message]: props.messageId,
        ...(props.done && shown ? { [messageAttributes.done]: '' } : {}),
      }}
    >
      {props.children}
      <WholeMarks marks={whole} view={view} />
      {layout.placed.map(({ mark, slot }) =>
        createPortal(
          <MarkButton mark={newest(mark)} view={view} />,
          slot,
          mark.id,
        ),
      )}
      {placedOpen || wholeOpen ? (
        <AnchorBox
          onElement={view.noteAnchor}
          range={placedOpen?.range ?? null}
          root={root}
        />
      ) : null}
      {selection && view.floating ? (
        <FloatingExplain
          align={props.align}
          busy={view.starting}
          onPress={view.explain}
          range={selection.range}
        />
      ) : null}
    </div>
  )
}

/**
 * The text of one member message or agent message in the chat of the shown
 * session tab, with the marks of its explanations and Explain by a finished
 * selection in it. A mark is a highlight of its quote with the state of its
 * explanation at its end, and a press on it opens its popover, or the menu
 * of the marks that overlap there. A mark whose text no longer matches
 * covers the whole message, and a press on any of its text opens it, except
 * in a message that folds. The press and the pointer find the marks in the
 * same regions, as `markRegions` says. Outside that chat, such as in a
 * popover, the text shows as it is.
 */
export function MarkedMessage(props: MarkedMessageProps) {
  const view = useContext(ExplainContext)
  if (!view) return props.children
  return <Marked {...props} view={view} />
}
