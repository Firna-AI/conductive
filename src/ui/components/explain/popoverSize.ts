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

/** The width and the highest height of the panel of a computer, in px. */
interface PanelSize {
  readonly width: number
  readonly height: number
}

/** The size of the panel of a computer by default. */
const defaultSize: PanelSize = {
  width: popoverWidth.value,
  height: popoverHeight.value,
}

/** The style that hands a size of the panel to its CSS. */
type PopoverSizeStyle = CSSProperties &
  Record<'--explain-width' | '--explain-height', string>

/**
 * The CSS custom properties of a size of the panel of a computer: its width
 * and its highest height, in px, which the CSS of `ExplainPopover` reads.
 * Without a size, they hold the default size. Each panel of a computer, in
 * the app and in the mockups, takes its size from here, so the CSS holds no
 * size of its own.
 */
export function popoverSizeStyle(
  size: PanelSize = defaultSize,
): PopoverSizeStyle {
  return {
    '--explain-width': `${size.width}px`,
    '--explain-height': `${size.height}px`,
  }
}
