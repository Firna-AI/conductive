/** One text node of a message, at its place in the text of the message. */
interface Segment {
  node: Text
  start: number
  end: number
}

/**
 * The text that a message shows, with the text node of each part of it, so
 * a place in the text maps to a place in the page and back.
 */
export interface TextModel {
  text: string
  segments: readonly Segment[]
}

/** A point of the page in a text node. */
interface TextPoint {
  node: Text
  offset: number
}

/**
 * The parts of a message whose text the message does not show as its own:
 * the parts that Explain draws, and text that only a screen reader gets.
 */
const SKIPPED = '[data-explain-ui], [data-explain-skip]'

/** Elements that start a line of their own when no style says otherwise. */
const BLOCKS = new Set([
  'ADDRESS',
  'BLOCKQUOTE',
  'DETAILS',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'OL',
  'P',
  'PRE',
  'SUMMARY',
  'TABLE',
  'TR',
  'UL',
])

/** Whether an element starts a line, a cell of a table row, or neither. */
function breakOf(style: CSSStyleDeclaration, tag: string): '\n' | '\t' | null {
  const display = style.display || (BLOCKS.has(tag) ? 'block' : 'inline')
  if (display === 'table-cell') return '\t'
  if (display.startsWith('inline') || display === 'contents') return null
  return '\n'
}

/**
 * Whether an element shows its text: it is not hidden, and it is not text
 * for screen readers only, which a clip hides from the eye.
 */
function shown(element: Element, style: CSSStyleDeclaration): boolean {
  if (
    typeof element.checkVisibility === 'function' &&
    !element.checkVisibility()
  )
    return false
  const clipped =
    (style.clipPath !== '' && style.clipPath !== 'none') ||
    (style.clip !== '' && style.clip !== 'auto')
  return !(style.position === 'absolute' && clipped)
}

/**
 * The text that a message shows: the text of each shown text node in order,
 * with a line break between two blocks and a tab between two cells of a
 * row, as a copy of the page gives it. It leaves out the parts of Explain,
 * such as the state of a mark, each hidden part, such as the text that only
 * a copy of a chip gives, and the text for screen readers only.
 */
export function textModel(root: Element): TextModel {
  let text = ''
  const segments: Segment[] = []
  const breakLine = (mark: '\n' | '\t') => {
    if (text !== '' && !text.endsWith('\n') && !text.endsWith('\t'))
      text += mark
  }
  const walk = (node: Node) => {
    if (node instanceof Text) {
      if (node.data === '') return
      segments.push({
        node,
        start: text.length,
        end: text.length + node.length,
      })
      text += node.data
      return
    }
    if (!(node instanceof Element) || node.matches(SKIPPED)) return
    const style = getComputedStyle(node)
    if (!shown(node, style)) return
    if (node.tagName === 'BR') {
      text += '\n'
      return
    }
    const mark = breakOf(style, node.tagName)
    if (mark) breakLine(mark)
    node.childNodes.forEach(walk)
    if (mark) breakLine(mark)
  }
  root.childNodes.forEach(walk)
  // A break after the last text belongs to no text, so it goes.
  return { text: text.slice(0, segments.at(-1)?.end ?? 0), segments }
}

/**
 * The place in the text of a point of the page, such as an end of a
 * selection. A point between two nodes takes the place of the first text
 * after it.
 */
export function offsetAt(model: TextModel, node: Node, offset: number): number {
  if (node instanceof Text) {
    const segment = model.segments.find((item) => item.node === node)
    if (segment) return segment.start + Math.min(offset, node.length)
  }
  const point = document.createRange()
  point.setStart(node, offset)
  const next = model.segments.find(
    (segment) => point.comparePoint(segment.node, 0) >= 0,
  )
  return next ? next.start : model.text.length
}

/**
 * The point of the page at a place in the text. A start goes into the text
 * that follows the place, and an end into the text that comes before it.
 */
export function pointAt(
  model: TextModel,
  offset: number,
  edge: 'start' | 'end',
): TextPoint | null {
  const segment =
    edge === 'start'
      ? model.segments.find((item) => item.end > offset)
      : model.segments.findLast((item) => item.start < offset)
  if (!segment) return null
  const inside = Math.max(
    0,
    Math.min(offset - segment.start, segment.node.length),
  )
  return { node: segment.node, offset: inside }
}

/** A range of the page over a part of the text, or null when it holds none. */
export function rangeOf(
  model: TextModel,
  start: number,
  end: number,
): Range | null {
  const from = pointAt(model, start, 'start')
  const to = pointAt(model, end, 'end')
  if (!from || !to) return null
  const range = document.createRange()
  range.setStart(from.node, from.offset)
  range.setEnd(to.node, to.offset)
  return range.collapsed ? null : range
}
