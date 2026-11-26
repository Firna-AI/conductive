import type { Viewport } from '@mokly/mokly'

/**
 * The viewports of a screen, for a part that draws a layout for each. A
 * screen of another viewport in a view, such as the Mac app in a phone
 * view, passes its own viewport to the part.
 */
export const viewports = [
  'desktop',
  'mobile',
] as const satisfies readonly Viewport[]
