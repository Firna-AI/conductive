/** A box of the window, in CSS px. */
export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/** The size of a menu, and the size of the window, in CSS px. */
interface Size {
  width: number
  height: number
}

/**
 * The point where a menu opens, in CSS px of the window: the pointer of a
 * right click, or a point below a row for the menu keys.
 */
export interface MenuAnchor {
  x: number
  y: number
}

/** The top left corner of a menu, in CSS px of the window. */
interface Place {
  left: number
  top: number
}

/** A menu keeps this gap to each side of the window. */
const edge = 4
/** The gap between a menu and its choices. */
const gap = 4

/** Keeps a start within the window, at the edge gap from each side. */
function within(start: number, length: number, room: number): number {
  return Math.max(edge, Math.min(start, room - length - edge))
}

/**
 * The first start of each try that fits, else the start that keeps the
 * most of the menu in the window.
 */
function firstFit(tries: readonly number[], length: number, room: number) {
  const fits = tries.find(
    (start) => start >= edge && start + length <= room - edge,
  )
  return fits ?? within(tries[0], length, room)
}

/**
 * The place of a menu at its anchor: its top left corner takes the point. A
 * menu that would pass the right side of the window moves left, and one that
 * would pass its bottom opens upwards from the point.
 */
export function placeMenu(anchor: MenuAnchor, menu: Size, room: Size): Place {
  return {
    left: within(anchor.x, menu.width, room.width),
    top: firstFit([anchor.y, anchor.y - menu.height], menu.height, room.height),
  }
}

/**
 * The place of the choices of an item, beside the menu and level with the
 * item: `lead` is the room above the first row of a menu, so the first
 * choice lines up with the item. Choices that would pass the right side of
 * the window open on the left of the menu, and choices that would pass its
 * bottom move up.
 */
export function placeChoices(
  menu: Box,
  item: Box,
  lead: number,
  choices: Size,
  room: Size,
): Place {
  return {
    left: firstFit(
      [menu.right + gap, menu.left - gap - choices.width],
      choices.width,
      room.width,
    ),
    top: within(item.top - lead, choices.height, room.height),
  }
}
