import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { markLabel } from '../../ui/components/explain/explainCopy'
import { MarkGlyph } from '../../ui/components/explain/MarkGlyph'
import marked from '../../ui/components/explain/MarkedText.module.css'
import { classes } from '../../ui/components/common/classes'
import controls from '../ui/controls.module.css'
import type { ExplainView } from './explain-context'
import type { Explanation } from './explanations'
import styles from './explain.module.css'
import { uiAttribute } from './mark-layout'
import { keepPopover } from './press-outside'

const ui = { [uiAttribute]: '' }

/**
 * The state of a mark, the shared `MarkGlyph`, as a button that opens the
 * popover of its explanation, so Tab reaches each mark. It stands at the end
 * of its mark, or in the box at the top right of a message that the mark
 * covers whole, as the mockups' `WholeMark` draws it. Screen readers hear
 * the title of the explanation and its state, and the pointer over it shows
 * the title. A press keeps a fold whose text holds it as it is, and keeps
 * the open popover until the press opens the popover of this mark.
 */
export function MarkButton(props: {
  mark: Explanation
  view: ExplainView
  whole?: boolean
}) {
  const { mark, view } = props
  return (
    <button
      aria-expanded={view.open === mark.id}
      aria-haspopup="dialog"
      aria-label={markLabel(mark.title, mark.state)}
      className={classes(
        controls.bare,
        styles.markButton,
        props.whole ? marked.wholeGlyph : styles.inline,
        view.open === mark.id && styles.active,
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        view.openPopover(mark.id)
      }}
      onPointerDown={(event) => keepPopover(event.nativeEvent)}
      ref={(element) => view.noteGlyph(mark.id, element)}
      title={mark.title}
      type="button"
    >
      <MarkGlyph state={mark.state} />
    </button>
  )
}

/**
 * The states of the marks whose text no longer matches, at the top right of
 * the message that they cover. Each opens the popover of its explanation.
 */
export function WholeMarks(props: {
  marks: readonly Explanation[]
  view: ExplainView
}) {
  if (props.marks.length === 0) return null
  return (
    <span className={styles.wholeGlyphs} {...ui}>
      {props.marks.map((mark) => (
        <MarkButton key={mark.id} mark={mark} view={props.view} whole />
      ))}
    </span>
  )
}

/**
 * The box of the mark whose popover is open, over the text of the mark, or
 * over the whole message for a mark that covers it. The popover keeps to
 * it: by CSS anchor positioning, or by its place in a browser without it.
 * It takes no pointer and draws nothing.
 */
export function AnchorBox(props: {
  root: RefObject<HTMLElement | null>
  range: Range | null
  onElement: (element: HTMLElement | null) => void
}) {
  const box = useRef<HTMLSpanElement>(null)
  const { root, range, onElement } = props
  useLayoutEffect(() => {
    const node = box.current
    const frame = root.current
    if (!node || !frame) return undefined
    const place = () => {
      const outer = frame.getBoundingClientRect()
      const inner = range ? range.getBoundingClientRect() : outer
      node.style.left = `${inner.left - outer.left}px`
      node.style.top = `${inner.top - outer.top}px`
      node.style.width = `${inner.width}px`
      node.style.height = `${inner.height}px`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [root, range])
  useEffect(() => {
    onElement(box.current)
    return () => onElement(null)
  }, [onElement])
  return <span aria-hidden className={styles.anchor} ref={box} {...ui} />
}
