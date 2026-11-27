import { classes } from '../../../../../src/ui/components/common/classes'
import {
  resizeHeightLabel,
  resizeWidthLabel,
} from '../../../../../src/ui/components/explain/explainCopy'
import styles from '../../../../../src/ui/components/explain/ExplainPopover.module.css'
import {
  popoverHeight,
  popoverWidth,
} from '../../../../../src/ui/components/explain/popoverSize'

/** The handle on the edge that changes the height, or the width. */
type ResizeAxis = 'height' | 'width'

/**
 * The panel of a computer after the member resized it: the size that the
 * member chose in px, and the handle that holds the focus.
 */
export type ResizedPanel = {
  readonly width: number
  /** The highest height, which the panel keeps until it closes. */
  readonly height: number
  readonly focus?: ResizeAxis
}

/**
 * The handle on the bottom edge, which changes the height, or on the right
 * edge, which changes the width. It is a separator in the order of Tab,
 * after the follow-up field, as the column handles are.
 */
function EdgeHandle(props: {
  axis: ResizeAxis
  value: number
  focused: boolean
}) {
  const height = props.axis === 'height'
  const range = height ? popoverHeight : popoverWidth
  return (
    <div
      aria-label={height ? resizeHeightLabel : resizeWidthLabel}
      aria-orientation={height ? 'horizontal' : 'vertical'}
      aria-valuemax={range.max}
      aria-valuemin={range.min}
      aria-valuenow={props.value}
      className={classes(
        styles.edge,
        height ? styles.edgeBottom : styles.edgeRight,
        props.focused && styles.resizing,
      )}
      role="separator"
      tabIndex={0}
    />
  )
}

/**
 * The handles of the panel of a computer that opens below its mark, from
 * the start of the mark, the place that the mockups draw. Its free edges
 * are the bottom and the right, and the corner between them moves both.
 * At rest the handles draw nothing. A drawing cannot hold the focus, so
 * the handle in `focus` takes the look of a drag, which is the same.
 */
export function PopoverResize(props: { resized?: ResizedPanel }) {
  const { resized } = props
  return (
    <>
      <EdgeHandle
        axis="height"
        focused={resized?.focus === 'height'}
        value={resized?.height ?? popoverHeight.value}
      />
      <EdgeHandle
        axis="width"
        focused={resized?.focus === 'width'}
        value={resized?.width ?? popoverWidth.value}
      />
      <div
        aria-hidden
        className={classes(styles.corner, styles.cornerBottomRight)}
      />
    </>
  )
}
