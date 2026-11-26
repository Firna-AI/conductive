import {
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import type { PanelDrag, PanelMove } from '../../app/panel-drag'
import { dividerKey } from '../../app/shortcuts/navigation'
import { dividerMove } from './divider-move'

/** What a handle moves along one axis, such as the width of a panel. */
export interface ResizeAxis {
  /**
   * 1 when the handle grows its size as it moves right or down, and -1 when
   * it grows its size as it moves left or up.
   */
  sign: 1 | -1
  /**
   * The change of the size for one px, such as the percent of the height of
   * the right column for its split. It is 1 when it is missing.
   */
  scale?: () => number
  /** Starts one drag from the size that shows. */
  drag: () => PanelDrag
  /** Takes one step of a key from the size that shows. */
  step: (move: PanelMove) => void
}

/**
 * The axes of a handle: `x` for a handle that stands up, such as between
 * two columns, and `y` for a handle that lies across. A corner has both.
 */
export type ResizeAxes = Readonly<Partial<Record<'x' | 'y', ResizeAxis>>>

/** The handlers of the element of a handle. */
export type ResizeHandlers = Pick<
  HTMLAttributes<HTMLElement>,
  | 'onKeyDown'
  | 'onLostPointerCapture'
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerUp'
>

/** A drag of the pointer that runs: its start, and one drag of each axis. */
interface Running {
  x: number
  y: number
  drags: readonly {
    axis: 'x' | 'y'
    /** The change of the size for one px of the pointer along the axis. */
    factor: number
    drag: PanelDrag
  }[]
}

/**
 * The pointer drag and the keys of a handle that resizes a panel. The
 * handles of the columns, the split of the right column, and the handles of
 * the Explain popover all take them from here. The handle drags with the
 * pointer, and each axis follows the move of the pointer along it. From
 * the keyboard, Left and Right move the `x` axis and Up and Down move the
 * `y` axis, alone or with Shift for a larger step. Home and End move each
 * axis to an end. A key with other modifiers, such as ⌥⌘←, stays free for
 * its shortcut. `dragging` is true while a drag of the pointer runs.
 */
export function useResizeHandle(axes: ResizeAxes): {
  dragging: boolean
  handlers: ResizeHandlers
} {
  const [running, setRunning] = useState<Running | null>(null)
  const each = (['x', 'y'] as const).flatMap((name) => {
    const axis = axes[name]
    return axis ? [{ name, axis }] : []
  })

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setRunning({
      x: event.clientX,
      y: event.clientY,
      drags: each.map(({ name, axis }) => ({
        axis: name,
        factor: axis.sign * (axis.scale?.() ?? 1),
        drag: axis.drag(),
      })),
    })
  }
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!running) return
    for (const { axis, factor, drag } of running.drags) {
      const moved =
        axis === 'x' ? event.clientX - running.x : event.clientY - running.y
      drag.move(factor * moved)
    }
  }
  const endDrag = () => {
    if (!running) return
    setRunning(null)
    for (const { drag } of running.drags) drag.end()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const moves = each.flatMap(({ name, axis }) => {
      const orientation = name === 'x' ? 'vertical' : 'horizontal'
      const key = dividerKey(event.nativeEvent, orientation)
      return key === null ? [] : [{ axis, key }]
    })
    if (moves.length === 0) return
    event.preventDefault()
    for (const { axis, key } of moves) {
      axis.step(dividerMove(key, axis.sign, axis.scale?.() ?? 1))
    }
  }
  return {
    dragging: running !== null,
    handlers: {
      onKeyDown,
      onLostPointerCapture: endDrag,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
    },
  }
}
