import {
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  type LucideIcon,
} from 'lucide-react'
import type { MenuEntry } from '../common/Menu'

/** A move of the row menu of a chosen repository. */
type RepositoryMove = 'default' | 'up' | 'down'

/** One item of the row menu of a chosen repository. */
export type RepositoryMenuItem = {
  move: RepositoryMove
  label: string
  icon: LucideIcon
  /** The place of the row rules out the move, so the item shows off. */
  disabled: boolean
}

/**
 * The row menu of a chosen repository, from repository-order decision 1 F:
 * Make default, which moves the row to the top, then Move up and Move down,
 * which move it one place. The first row has Make default and Move up off,
 * and the last row has Move down off. `place` counts the repositories
 * above the row, of `count` chosen repositories. The list holds no data of
 * a screen, so the app can import it.
 */
export function repositoryMenuItems(
  place: number,
  count: number,
): RepositoryMenuItem[] {
  return [
    {
      move: 'default',
      label: 'Make default',
      icon: ArrowUpToLine,
      disabled: place === 0,
    },
    { move: 'up', label: 'Move up', icon: ArrowUp, disabled: place === 0 },
    {
      move: 'down',
      label: 'Move down',
      icon: ArrowDown,
      disabled: place === count - 1,
    },
  ]
}

/** The row menu of a chosen repository as a view draws it. */
export function repositoryMenuOf(place: number, count: number): MenuEntry[] {
  return repositoryMenuItems(place, count).map((item): MenuEntry => ({
    kind: 'item',
    label: item.label,
    icon: item.icon,
    disabled: item.disabled,
  }))
}

/**
 * What a screen reader hears after a move: the name of the repository and
 * its new place, counted from 1, as after a move of an org tile.
 */
export function repositoryPlaceText(
  name: string,
  place: number,
  count: number,
): string {
  return `${name} moves to place ${place + 1} of ${count}`
}

/** The label of the first chosen repository. */
export const defaultRepositoryLabel = 'Default'
