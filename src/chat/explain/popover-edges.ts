/** A box in CSS px of the window, as `getBoundingClientRect` gives it. */
interface Box {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/** The space between the panel and its mark, and the edge of the frame. */
export const margin = 6

/** The space that a panel with no shown mark keeps under it. */
const footGap = 12

/**
 * Where the panel of a computer stands, and the room that it has. Its free
 * edges are the edges away from its mark: `block` above or below the chat,
 * which the height handle takes, and `inline` at its side, which the width
 * handle takes. The rooms are in whole px.
 */
export interface PopoverLayout {
  readonly block: 'top' | 'bottom'
  readonly inline: 'left' | 'right'
  /** The height that the panel shows. */
  readonly height: number
  /** The highest height that the panel can show on its side of the mark. */
  readonly heightRoom: number
  /** The widest that the panel can be and still fit on its side of the mark. */
  readonly widthRoom: number
  /**
   * The widest that a chosen width shows: the larger room beside the mark,
   * and the frame less its margins.
   */
  readonly widthCap: number
}

/** A room in whole px, and none where the frame leaves no room. */
const whole = (room: number): number => Math.max(0, Math.floor(room))

/**
 * The free edges and the rooms of the panel, from the boxes of the panel,
 * its mark, and its frame. Below the mark the bottom edge is free, and above
 * it the top edge. From the start of the mark the right edge is free, and
 * where the panel ends at the end of the mark the left edge. A panel with no
 * shown mark stands at the top right of the frame, so its bottom and left
 * edges are free, and its height stops 12 px above the bottom of the frame.
 */
export function popoverLayout(
  panel: Box,
  mark: Box | null,
  frame: Box,
): PopoverLayout {
  const height = panel.bottom - panel.top
  const inFrame = frame.right - frame.left - 2 * margin
  if (!mark) {
    const room = whole(Math.min(panel.right - frame.left - margin, inFrame))
    return {
      block: 'bottom',
      inline: 'left',
      height,
      heightRoom: whole(frame.bottom - footGap - panel.top),
      widthRoom: room,
      widthCap: room,
    }
  }
  const below = panel.top + panel.bottom >= mark.top + mark.bottom
  const atStart =
    Math.abs(panel.left - mark.left) <= Math.abs(panel.right - mark.right)
  // One room goes from the start of the mark to the end of the frame, and
  // the other from the end of the mark to the start of the frame.
  const fromStart = frame.right - margin - mark.left
  const fromEnd = mark.right - margin - frame.left
  return {
    block: below ? 'bottom' : 'top',
    inline: atStart ? 'right' : 'left',
    height,
    heightRoom: whole(
      below
        ? frame.bottom - mark.bottom - 2 * margin
        : mark.top - frame.top - 2 * margin,
    ),
    widthRoom: whole(Math.min(atStart ? fromStart : fromEnd, inFrame)),
    widthCap: whole(Math.min(Math.max(fromStart, fromEnd), inFrame)),
  }
}

/**
 * The layout of the panel now. Its frame is the box that holds its place,
 * or else the page.
 */
export function measureLayout(
  panel: HTMLElement,
  anchor: HTMLElement | null,
): PopoverLayout {
  const frame =
    panel.offsetParent instanceof HTMLElement
      ? panel.offsetParent
      : document.documentElement
  return popoverLayout(
    panel.getBoundingClientRect(),
    anchor?.getBoundingClientRect() ?? null,
    frame.getBoundingClientRect(),
  )
}

const fields: readonly (keyof PopoverLayout)[] = [
  'block',
  'inline',
  'height',
  'heightRoom',
  'widthRoom',
  'widthCap',
]

/** Whether two layouts are the same, so a new one draws nothing again. */
export function sameLayout(
  last: PopoverLayout | null,
  next: PopoverLayout,
): boolean {
  return last !== null && fields.every((key) => last[key] === next[key])
}
