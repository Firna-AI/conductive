import { classes } from '../../ui/components/common/classes'
import {
  resizeHeightLabel,
  resizeWidthLabel,
} from '../../ui/components/explain/explainCopy'
import styles from '../../ui/components/explain/ExplainPopover.module.css'
import { useResizeHandle } from '../../shell/layout/useResizeHandle'
import type { PopoverLayout } from './popover-edges'
import type { EdgeAxis, PopoverHandles } from './usePopoverResize'

type Edge = PopoverLayout['block'] | PopoverLayout['inline']

const edgeClasses: Readonly<Record<Edge, string | undefined>> = {
  top: styles.edgeTop,
  bottom: styles.edgeBottom,
  left: styles.edgeLeft,
  right: styles.edgeRight,
}

const cornerClasses: Readonly<
  Record<
    `${PopoverLayout['block']}-${PopoverLayout['inline']}`,
    string | undefined
  >
> = {
  'top-left': styles.cornerTopLeft,
  'top-right': styles.cornerTopRight,
  'bottom-left': styles.cornerBottomLeft,
  'bottom-right': styles.cornerBottomRight,
}

/**
 * The handle on a free edge. It is a separator in the order of Tab, after
 * the rest of the popover. The handle above or below the chat lies across
 * and moves on Up and Down. The handle at the side moves on Left and Right.
 * Its value is the size that the panel shows.
 */
function EdgeHandle(props: { label: string; edge: Edge; axis: EdgeAxis }) {
  const across = props.edge === 'top' || props.edge === 'bottom'
  const handle = useResizeHandle(across ? { y: props.axis } : { x: props.axis })
  return (
    <div
      aria-label={props.label}
      aria-orientation={across ? 'horizontal' : 'vertical'}
      aria-valuemax={props.axis.max}
      aria-valuemin={props.axis.min}
      aria-valuenow={props.axis.value}
      className={classes(
        styles.edge,
        edgeClasses[props.edge],
        handle.dragging && styles.resizing,
      )}
      role="separator"
      tabIndex={0}
      {...handle.handlers}
    />
  )
}

/**
 * The corner between the two free edges, which moves both. It takes only
 * the pointer, so it has no place in the order of Tab.
 */
function CornerHandle(props: { handles: PopoverHandles }) {
  const { layout, width, height } = props.handles
  const handle = useResizeHandle({ x: width, y: height })
  return (
    <div
      aria-hidden
      className={classes(
        styles.corner,
        cornerClasses[`${layout.block}-${layout.inline}`],
        handle.dragging && styles.resizing,
      )}
      {...handle.handlers}
    />
  )
}

/**
 * The handles of the panel of a computer: one on its free edge above or
 * below the chat, which changes the height, one on its free edge at the
 * side, which changes the width, and their corner. They lie inside the
 * panel, so a press on one keeps the popover open. Each edge handle takes
 * the drag and the keys of `useResizeHandle`, as the column handles do, and
 * Escape on it closes the popover. The corner takes only the drag.
 */
export function PopoverResize(props: { handles: PopoverHandles }) {
  const { layout, width, height } = props.handles
  return (
    <>
      <EdgeHandle axis={height} edge={layout.block} label={resizeHeightLabel} />
      <EdgeHandle axis={width} edge={layout.inline} label={resizeWidthLabel} />
      <CornerHandle handles={props.handles} />
    </>
  )
}
