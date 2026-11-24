import type { CSSProperties } from 'react'
import type { PanelWidth } from '../layout/ResizeHandle'

/**
 * The width of the popover of a computer by default, and the range of its
 * handle, in px.
 */
export const popoverWidth: PanelWidth = { value: 400, min: 320, max: 720 }

/**
 * The highest height of the popover of a computer by default, and the range
 * of its handle, in px.
 */
export const popoverHeight: PanelWidth = { value: 420, min: 200, max: 960 }

/** The style that hands a size of the panel to its CSS. */
type PopoverSizeStyle = CSSProperties &
  Record<'--explain-width' | '--explain-height', string>

/**
 * The CSS custom properties of a size of the panel of a computer: its width
 * and its highest height, in px, which the CSS of `ExplainPopover` reads.
 */
export function popoverSizeStyle(size: {
  readonly width: number
  readonly height: number
}): PopoverSizeStyle {
  return {
    '--explain-width': `${size.width}px`,
    '--explain-height': `${size.height}px`,
  }
}
