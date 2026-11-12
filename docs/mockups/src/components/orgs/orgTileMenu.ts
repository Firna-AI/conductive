import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { MenuEntry } from '../common/Menu'

/** A move of the tile menu: one place up or down the rail. */
export type TileMove = 'up' | 'down'

/** One item of the menu of an org tile in the rail. */
export type TileMenuItem = {
  move: TileMove
  label: string
  icon: LucideIcon
  /** The place of the tile rules out the move, so the item shows off. */
  disabled: boolean
}

/**
 * The menu of an org tile in the rail, from decision 515 C: Move up and
 * Move down, which move the tile one place. The first tile has Move up
 * off, and the last tile has Move down off. Every org tile has this menu,
 * also the tile of a suspended or deleted org, from decision 516 A. Create
 * org, Operator, and the account have no menu. `place` counts the orgs
 * above the tile, of `count` orgs in the rail. The list holds no data of a
 * screen, so the app can import it.
 */
export function tileMenuItems(place: number, count: number): TileMenuItem[] {
  return [
    { move: 'up', label: 'Move up', icon: ArrowUp, disabled: place === 0 },
    {
      move: 'down',
      label: 'Move down',
      icon: ArrowDown,
      disabled: place === count - 1,
    },
  ]
}

/** The menu of an org tile as a view draws it. */
export function tileMenuOf(place: number, count: number): MenuEntry[] {
  return tileMenuItems(place, count).map((item): MenuEntry => ({
    kind: 'item',
    label: item.label,
    icon: item.icon,
    disabled: item.disabled,
  }))
}
