import type { PanelMove } from '../../app/panels'
import type { DividerKey } from '../../app/shortcuts/navigation'

/** The step of an arrow key, and of an arrow key with Shift, in px. */
const step = 8
const bigStep = 32

/**
 * The move of each key of a divider. `sign` is 1 when the handle grows its
 * panel as it moves right or down. `scale` turns the px of a step into the
 * unit of the panel, such as percent for the split of the right column.
 */
export function dividerMove(
  key: DividerKey,
  sign: 1 | -1,
  scale = 1,
): PanelMove {
  switch (key) {
    case 'back':
      return { by: -sign * step * scale }
    case 'forward':
      return { by: sign * step * scale }
    case 'large-back':
      return { by: -sign * bigStep * scale }
    case 'large-forward':
      return { by: sign * bigStep * scale }
    case 'first':
      return { to: 'min' }
    case 'last':
      return { to: 'max' }
  }
}
