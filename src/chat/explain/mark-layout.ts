import type { Explanation } from './explanations'
import { findQuote } from './quote-match'
import { pointAt, rangeOf, textModel, type TextModel } from './text-model'

/** A mark found in its message: its range, and the slot of its state. */
interface PlacedMark {
  mark: Explanation
  range: Range
  /** The element at the end of the mark that holds its state. */
  slot: HTMLElement
}

/**
 * The marks of one message: the marks whose quote the message shows, the
 * parts where two of them overlap, and the marks whose text no longer
 * matches, which cover the whole message.
 */
export interface MarkLayout {
  placed: readonly PlacedMark[]
  overlaps: readonly Range[]
  whole: readonly Explanation[]
}

/** A text node that a slot split, and its text just after the split. */
interface Split {
  head: Text
  tail: Text
  headText: string
}

/** A layout in the page, with what undoes it. */
export interface AppliedMarks {
  layout: MarkLayout
  slots: readonly HTMLElement[]
  splits: readonly Split[]
}

export const emptyLayout: MarkLayout = { placed: [], overlaps: [], whole: [] }

/** The attribute of each part that Explain draws inside a message. */
export const uiAttribute = 'data-explain-ui'

/**
 * Puts a slot at a place of the text: after the text node that ends there,
 * or between the two halves of the text node that holds the place.
 */
function insertSlot(
  model: TextModel,
  offset: number,
  slot: HTMLElement,
  splits: Split[],
): void {
  const point = pointAt(model, offset, 'end')
  if (!point) return
  const { node } = point
  if (point.offset < node.length) {
    const tail = node.splitText(point.offset)
    splits.push({ head: node, tail, headText: node.data })
  }
  node.after(slot)
}

/**
 * Finds the marks in the text that a message shows and puts the slot of
 * each state at the end of its mark. The fill of the marks draws as
 * highlights, so only the slots and the text nodes that they split change
 * the page, and `undoMarks` takes both back. The slots go in from the last
 * end to the first, so a split leaves each earlier place as it was. The
 * ranges of the fill come from the text after the splits, which shows the
 * same text, because the text leaves the slots out.
 */
export function applyMarks(
  root: HTMLElement,
  marks: readonly Explanation[],
  slotClass: string,
): AppliedMarks {
  const model = textModel(root)
  const found: { mark: Explanation; start: number; end: number }[] = []
  const whole: Explanation[] = []
  for (const mark of marks) {
    const span = findQuote(model.text, mark.anchor)
    if (span && rangeOf(model, span.start, span.end))
      found.push({ mark, ...span })
    else whole.push(mark)
  }
  const splits: Split[] = []
  const slots = new Map<string, HTMLElement>()
  for (const item of [...found].sort((left, right) => right.end - left.end)) {
    const slot = document.createElement('span')
    slot.setAttribute(uiAttribute, '')
    slot.className = slotClass
    insertSlot(model, item.end, slot, splits)
    slots.set(item.mark.id, slot)
  }
  const split = textModel(root)
  const placed = found.flatMap(({ mark, start, end }) => {
    const slot = slots.get(mark.id)
    const range = rangeOf(split, start, end)
    return slot && range ? [{ mark, range, slot }] : []
  })
  const overlaps = found.flatMap((left, index) =>
    found.slice(index + 1).flatMap((right) => {
      const start = Math.max(left.start, right.start)
      const end = Math.min(left.end, right.end)
      const range = start < end ? rangeOf(split, start, end) : null
      return range ? [range] : []
    }),
  )
  return {
    layout: { placed, overlaps, whole },
    slots: [...slots.values()],
    splits,
  }
}

/**
 * Takes the slots out and joins each split text node again. A text node
 * whose text changed since the split, such as by React, keeps its new text,
 * and the old second half goes.
 */
export function undoMarks(applied: AppliedMarks): void {
  for (const slot of applied.slots) slot.remove()
  for (const { head, tail, headText } of [...applied.splits].reverse()) {
    const joins =
      tail.isConnected && head.data === headText && head.nextSibling === tail
    if (joins) head.appendData(tail.data)
    tail.remove()
  }
}

/** Whether a change of the page touches only the parts that Explain draws. */
export function ownChange(record: MutationRecord): boolean {
  const inside = (node: Node) => {
    const element = node instanceof Element ? node : node.parentElement
    return element?.closest(`[${uiAttribute}]`) != null
  }
  if (inside(record.target)) return true
  const nodes = [...record.addedNodes, ...record.removedNodes]
  return (
    record.type === 'childList' &&
    nodes.length > 0 &&
    nodes.every(
      (node) => node instanceof Element && node.hasAttribute(uiAttribute),
    )
  )
}
