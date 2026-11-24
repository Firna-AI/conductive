import type { CSSProperties } from 'react'
import { classes } from '../../../../../src/ui/components/common/classes'
import type { PanelWidth } from '../../../../../src/ui/components/layout/ResizeHandle'
import {
  resizeHeightLabel,
  resizeWidthLabel,
} from '../../../../../src/ui/components/explain/explainCopy'
import styles from '../../../../../src/ui/components/explain/ExplainPopover.module.css'

/** The width of the panel by default, and the range of a drag, in px. */
const panelWidth: PanelWidth = { value: 400, min: 320, max: 720 }

/** The highest height of the panel by default, and the range of a drag. */
const panelHeight: PanelWidth = { value: 420, min: 200, max: 960 }

/** The handle on the edge that changes the height, or the width. */
export type ResizeAxis = 'height' | 'width'

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

/** The style that hands the chosen size of the panel to its CSS. */
type PanelSizeStyle = CSSProperties &
  Record<'--explain-width' | '--explain-height', string>

/** The CSS custom properties of the size that the member chose. */
export function panelSizeStyle(size: ResizedPanel): PanelSizeStyle {
  return {
    '--explain-width': `${size.width}px`,
    '--explain-height': `${size.height}px`,
  }
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
  const range = height ? panelHeight : panelWidth
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
        value={resized?.height ?? panelHeight.value}
      />
      <EdgeHandle
        axis="width"
        focused={resized?.focus === 'width'}
        value={resized?.width ?? panelWidth.value}
      />
      <div
        aria-hidden
        className={classes(styles.corner, styles.cornerBottomRight)}
      />
    </>
  )
}
