/**
 * The words of the zoom bar of a picture and of its expanded window. This
 * module imports no fixture, so the app can use it too.
 */
export const pictureCopy = {
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  fit: 'Fit',
  expand: 'Expand',
  close: 'Close',
  /** The spoken name of the zoom, such as "Zoom 26%". */
  zoomLabel: (percent: string) => `Zoom ${percent}`,
} as const

/** The scale of a picture as a whole percentage, such as `26%`. */
export function zoomPercent(scale: number): string {
  return `${Math.max(1, Math.round(scale * 100))}%`
}
