/**
 * Where the reader left the chat of a session: at the bottom, or at a row of
 * the transcript, by the key of the row and the distance of its top below the
 * top of the box. The distance is negative when the row starts above the box.
 */
export type ChatPlace =
  { kind: 'bottom' } | { kind: 'row'; row: string; offset: number }

/** The kept place of the shown session, which the keeper reads and writes. */
export interface PlaceMemory {
  read(): ChatPlace | undefined
  write(place: ChatPlace): void
}

/** The places of the session tabs of one chat, by session ID. */
export type ChatPlaces = Map<string, ChatPlace>

/** The attribute that holds the key of each row of the transcript. */
export const rowKeyAttribute = 'data-row'

const bottom: ChatPlace = { kind: 'bottom' }

/** The memory of the place of `sessionId` in `places`. */
export function placeMemory(
  places: ChatPlaces,
  sessionId: string,
): PlaceMemory {
  return {
    read: () => places.get(sessionId),
    write: (place) => places.set(sessionId, place),
  }
}

/** `row`, or the first row after it with a key. */
function keyedFrom(row: Element | null): Element | null {
  let current = row
  while (current && !current.hasAttribute(rowKeyAttribute)) {
    current = current.nextElementSibling
  }
  return current
}

/**
 * The place of a reader whose top row in view is `row`, or the bottom when
 * `row` is null. A row with no key, such as the line of an earlier page that
 * loads, gives its place to the next row with a key.
 */
export function placeAt(scroller: Element, row: Element | null): ChatPlace {
  const keyed = keyedFrom(row)
  const key = keyed?.getAttribute(rowKeyAttribute)
  if (!keyed || !key) return bottom
  const offset =
    keyed.getBoundingClientRect().top - scroller.getBoundingClientRect().top
  return { kind: 'row', row: key, offset }
}

/** The row of `transcript` with the key `key`, if it shows. */
function rowOf(transcript: Element, key: string): Element | null {
  for (const row of Array.from(transcript.children)) {
    if (row.getAttribute(rowKeyAttribute) === key) return row
  }
  return null
}

/**
 * Shows `place` in `scroller`. The box keeps its bottom in place, so a
 * scroll position of 0 is the bottom. A row that the transcript no longer
 * shows, such as a run of tool calls that a work fold took, gives the
 * bottom, because a guess at another row can show a place that the reader
 * never read.
 */
export function showPlace(
  scroller: HTMLElement,
  transcript: Element,
  place: ChatPlace | undefined,
): void {
  const row = place?.kind === 'row' ? rowOf(transcript, place.row) : null
  if (!row || place?.kind !== 'row') {
    scroller.scrollTop = 0
    return
  }
  const top = scroller.getBoundingClientRect().top + place.offset
  scroller.scrollTop += row.getBoundingClientRect().top - top
}
