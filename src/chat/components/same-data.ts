import type { ReactElement } from 'react'

/**
 * Whether a value is a plain record of data: not a list, not a React
 * element, and not an instance of a class.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype &&
    !('$$typeof' in value)
  )
}

/**
 * Whether two values hold the same data: the same value, or lists or plain
 * records whose values hold the same data, down to `levels` levels. Below
 * them, and for a function, a React element, or another object, only the
 * same value counts.
 */
function holdsSame(before: unknown, after: unknown, levels: number): boolean {
  if (Object.is(before, after)) return true
  if (levels === 0) return false
  if (Array.isArray(before) && Array.isArray(after)) {
    return (
      before.length === after.length &&
      before.every((value, index) => holdsSame(value, after[index], levels - 1))
    )
  }
  if (!isRecord(before) || !isRecord(after)) return false
  const keys = Object.keys(before)
  return (
    keys.length === Object.keys(after).length &&
    keys.every(
      (key) =>
        Object.hasOwn(after, key) &&
        holdsSame(before[key], after[key], levels - 1),
    )
  )
}

/**
 * Whether a part of the transcript gets the same data again, so that `memo`
 * can skip its render. Each prop must be the same value, or a list or a
 * plain record of the same values, for three levels under the prop. So a
 * run of tool calls compares its calls, a work fold compares the item of
 * each step, and the line of a late answer compares the names of its parts:
 * `groupEntries` and the cards make these lists again at each change. The
 * transcript never changes an item, a call, or the end of a turn in place.
 * A change makes a new value, so this check never hides a change.
 */
export function sameData<Props extends object>(
  before: Props,
  after: Props,
): boolean {
  return holdsSame(before, after, 4)
}

/**
 * Whether two values hold the same plain data at each depth: the same
 * strings, numbers, booleans, and nulls, in lists and plain records of the
 * same shape. The blocks and the inline text of an agent message hold plain
 * data only, and two parses of the same text give the same data. So each
 * update of a live message keeps the drawing of each block and each text
 * that did not change. A function or a React element counts only as the
 * same value.
 */
export function samePlainData(before: unknown, after: unknown): boolean {
  return holdsSame(before, after, Number.POSITIVE_INFINITY)
}

/**
 * Whether two elements draw the same: the same component and key, with
 * props that hold the same data, as `sameData` says.
 */
export function sameElement(
  before: ReactElement<object>,
  after: ReactElement<object>,
): boolean {
  return (
    before.type === after.type &&
    before.key === after.key &&
    sameData(before.props, after.props)
  )
}

/**
 * Keeps one part for each key object, such as the card of a request, while
 * each new part holds the same data as the kept one. A list that the chat
 * builds again at each change, such as the cards of the transcript, then
 * gives the same part for the same data, so the row of the part skips its
 * render. The key is the record that the part shows. The kept parts go
 * with their records.
 */
export class KeptParts<Part extends object> {
  private readonly parts = new WeakMap<object, Part>()
  private readonly same: (before: Part, after: Part) => boolean

  constructor(same: (before: Part, after: Part) => boolean) {
    this.same = same
  }

  /** The part that `key` kept, when `part` holds the same data. Else `part`, which `key` then keeps. */
  keep(key: object, part: Part): Part {
    const kept = this.parts.get(key)
    if (kept !== undefined && this.same(kept, part)) return kept
    this.parts.set(key, part)
    return part
  }
}
