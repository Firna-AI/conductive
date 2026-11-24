import { useState, type CSSProperties, type RefObject } from 'react'
import {
  PopoverSize,
  type ExplainSize,
  type PopoverAxis,
} from '../../app/explain-size'
import { useStore } from '../../app/store'
import type { ResizeAxis } from '../../shell/layout/useResizeHandle'
import {
  popoverHeight,
  popoverSizeStyle,
  popoverWidth,
} from '../../ui/components/explain/popoverSize'
import { footGap, type PopoverLayout } from './popover-edges'
import { anchorsInCss, usePopoverLayout, type MarkSide } from './popover-place'

/** The moves of one edge handle, and the value that it shows. */
export interface EdgeAxis extends ResizeAxis {
  /** The size that the panel shows, the value of the handle. */
  value: number
  /** The ends of the range of a move, which hold `value`. */
  min: number
  max: number
}

/** The handles of the panel: its free edges, and the axis of each. */
export interface PopoverHandles {
  layout: PopoverLayout
  width: EdgeAxis
  height: EdgeAxis
}

/**
 * The size of the panel of a computer, and the moves of its handles, as
 * [The size on a computer](../../../docs/protocol/explain-popover.md#the-size-on-a-computer)
 * says. The panel takes the size that `chosen` keeps, and from its first
 * move the size that it moved to. Its width shows at most as wide as the
 * larger room beside the mark, inside the frame. Each move starts from the
 * layout of that moment and from the size that the panel shows, and a move
 * of the width keeps the side of the mark that the panel shows. On a phone,
 * the sheet takes none of this.
 */
export function usePopoverResize(
  panel: RefObject<HTMLElement | null>,
  anchor: HTMLElement | null,
  chosen: ExplainSize,
  computer: boolean,
): {
  /**
   * The width and the highest height, as CSS custom properties, and the
   * space that a panel with no shown mark keeps under it.
   */
  style: CSSProperties | undefined
  /** The panel keeps its moved height until it closes. */
  fixedHeight: boolean
  /** The panel tries the end of its mark first. */
  endFirst: boolean
  handles: PopoverHandles | null
  /**
   * Finds the free edges again, such as when the pointer or the focus comes
   * into the panel, so the handles lie on the free edges before a move.
   */
  refresh: () => void
} {
  const [size] = useState(() => new PopoverSize(chosen))
  const moved = useStore(size.moved)
  const chosenWidth = useStore(chosen.width.chosen)
  const chosenHeight = useStore(chosen.height.chosen)
  const [side, setSide] = useState<MarkSide | null>(null)
  const width = moved.width ?? chosenWidth ?? popoverWidth.value
  const height = moved.height ?? chosenHeight ?? popoverHeight.value
  const place = computer && !anchorsInCss() ? { height, side } : null
  const { layout, measure } = usePopoverLayout(panel, anchor, computer, place)
  const refresh = () => {
    measure()
  }
  if (!computer) {
    return {
      style: undefined,
      fixedHeight: false,
      endFirst: false,
      handles: null,
      refresh,
    }
  }
  const shownWidth = layout ? Math.min(width, layout.widthCap) : width
  const panelStyle = {
    style: {
      ...popoverSizeStyle({ width: shownWidth, height }),
      '--explain-foot-gap': `${footGap}px`,
    },
    fixedHeight: moved.height !== null,
    endFirst: side === 'end',
    refresh,
  }
  if (!layout) return { ...panelStyle, handles: null }
  /**
   * The layout and the size that shows at the start of a move. A move of
   * the width keeps the side of the mark that the panel shows. A panel with
   * no shown mark has no side to keep.
   */
  const start = (axis: PopoverAxis): { from: number; room: number } => {
    const now = measure() ?? layout
    if (axis === 'width') {
      if (anchor) setSide(now.inline === 'right' ? 'start' : 'end')
      return {
        from: Math.min(size.size('width'), now.widthCap),
        room: now.widthRoom,
      }
    }
    const kept = size.moved.get().height !== null
    return {
      from: kept ? Math.min(size.size('height'), now.heightRoom) : now.height,
      room: now.heightRoom,
    }
  }
  const axis = (
    name: PopoverAxis,
    sign: 1 | -1,
    shown: number,
    room: number,
  ): EdgeAxis => {
    const { min, max } = name === 'width' ? popoverWidth : popoverHeight
    const value = Math.round(shown)
    return {
      sign,
      value,
      min: Math.min(value, min),
      max: Math.max(value, Math.min(max, room)),
      drag: () => {
        const at = start(name)
        return size.drag(name, at.from, at.room)
      },
      step: (move) => {
        const at = start(name)
        size.step(name, at.from, move, at.room)
      },
    }
  }
  const shownHeight =
    moved.height === null
      ? layout.height
      : Math.min(moved.height, layout.heightRoom)
  return {
    ...panelStyle,
    handles: {
      layout,
      width: axis(
        'width',
        layout.inline === 'right' ? 1 : -1,
        shownWidth,
        layout.widthRoom,
      ),
      height: axis(
        'height',
        layout.block === 'bottom' ? 1 : -1,
        shownHeight,
        layout.heightRoom,
      ),
    },
  }
}
