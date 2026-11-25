import {
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  X,
  type LucideIcon,
} from 'lucide-react'
import { repositoryRemoval } from './repositoryRemovalCopy'

/** An action of the row menu of a chosen repository. */
type RepositoryAction = 'default' | 'up' | 'down' | 'remove'

/** One item of the row menu of a chosen repository. */
type RepositoryMenuItem = {
  kind: 'item'
  action: RepositoryAction
  label: string
  icon: LucideIcon
  /** The place of the row rules out the move, so the item shows off. */
  disabled: boolean
  tone?: 'danger'
}

/** One row of the row menu of a chosen repository: an item or a divider. */
export type RepositoryMenuEntry = RepositoryMenuItem | { kind: 'divider' }

/**
 * The row menu of a chosen repository: Make default, which moves the row
 * to the top, then Move up and Move down, which move it one place. The
 * first row has Make default and Move up off, and the last row has Move
 * down off. Remove comes last, after a divider, in the danger tone, with
 * the label and the icon of Remove in Edit. It is never off, because Edit
 * also removes the first and the only row. `place` counts the
 * repositories above the row, of `count` chosen repositories. The list
 * holds no data of a screen, so the app can import it. The mockups draw
 * its entries as they are, and the app adds what each item does.
 */
export function repositoryMenuItems(
  place: number,
  count: number,
): RepositoryMenuEntry[] {
  return [
    {
      kind: 'item',
      action: 'default',
      label: 'Make default',
      icon: ArrowUpToLine,
      disabled: place === 0,
    },
    {
      kind: 'item',
      action: 'up',
      label: 'Move up',
      icon: ArrowUp,
      disabled: place === 0,
    },
    {
      kind: 'item',
      action: 'down',
      label: 'Move down',
      icon: ArrowDown,
      disabled: place === count - 1,
    },
    { kind: 'divider' },
    {
      kind: 'item',
      action: 'remove',
      label: repositoryRemoval.item,
      icon: X,
      disabled: false,
      tone: 'danger',
    },
  ]
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
