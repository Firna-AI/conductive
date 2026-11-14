import type { BridgeSize } from '../shared/terminal-bridge'

/** The smallest font that fits a larger shared size into the panel. */
const MIN_SHARED_FONT_SIZE = 6

/**
 * The font size that fits the shared size into the panel. The cell grows
 * with the font, so the scale of the larger side gives the size, in steps of
 * half a pixel. It is never larger than the normal font, and never smaller
 * than `MIN_SHARED_FONT_SIZE`.
 */
export function fittedFontSize(
  normal: number,
  panel: { cols: number; rows: number },
  shared: BridgeSize,
): number {
  const scale = Math.min(
    panel.cols / shared.columns,
    panel.rows / shared.rows,
    1,
  )
  const size = Math.floor(normal * scale * 2) / 2
  return Math.max(MIN_SHARED_FONT_SIZE, Math.min(normal, size))
}
