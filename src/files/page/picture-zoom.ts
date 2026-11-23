import type { PictureSize } from '../../ui/components/files/ImageView'

/**
 * The zoom of a picture in its view. `fit` shows the whole picture at its
 * own size or smaller, in the middle of the view, and follows each new size
 * of the view. `zoomed` shows it at `scale` times its own size, moved by
 * `x` and `y` CSS px from the middle of the view.
 */
export type PictureZoom =
  { kind: 'fit' } | { kind: 'zoomed'; scale: number; x: number; y: number }

/** Where the picture shows: its scale, and its move from the middle. */
export interface PicturePlace {
  scale: number
  x: number
  y: number
}

/** A point in CSS px from the middle of the view. */
export interface ViewPoint {
  x: number
  y: number
}

export const fitZoom: PictureZoom = { kind: 'fit' }

/** The room around a fitted picture, as the shared `ImageView` gives it. */
const viewPadding = 16

/** The largest scale: eight times the own size of the picture. */
export const maxScale = 8

/** The scales that Zoom in and Zoom out step through. */
const steps = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8]

/** The scale of a fitted picture: its own size, or smaller to fit the view. */
export function fitScale(picture: PictureSize, view: PictureSize): number {
  const width = Math.max(1, view.width - 2 * viewPadding)
  const height = Math.max(1, view.height - 2 * viewPadding)
  return Math.min(1, width / picture.width, height / picture.height)
}

/**
 * Keeps a picture in the view. A side that fits the view stays in the
 * middle. A side that is larger than the view keeps the view covered.
 */
function clampMove(size: number, view: number, move: number): number {
  const room = Math.max(0, (size - view) / 2)
  return Math.min(room, Math.max(-room, move))
}

/** Where the picture shows with `zoom` in a view of size `view`. */
export function placeOf(
  zoom: PictureZoom,
  picture: PictureSize,
  view: PictureSize,
): PicturePlace {
  const fit = fitScale(picture, view)
  if (zoom.kind === 'fit' || zoom.scale <= fit)
    return { scale: fit, x: 0, y: 0 }
  const scale = Math.min(maxScale, zoom.scale)
  return {
    scale,
    x: clampMove(picture.width * scale, view.width, zoom.x),
    y: clampMove(picture.height * scale, view.height, zoom.y),
  }
}

/**
 * The zoom at a new scale, which keeps the spot of the picture at `point`
 * under `point`. A scale at or under the fit scale gives `fit`.
 */
export function zoomTo(
  zoom: PictureZoom,
  picture: PictureSize,
  view: PictureSize,
  scale: number,
  point: ViewPoint = { x: 0, y: 0 },
): PictureZoom {
  const now = placeOf(zoom, picture, view)
  const next = Math.min(maxScale, scale)
  if (!(next > fitScale(picture, view) * 1.001)) return fitZoom
  const ratio = next / now.scale
  const place = placeOf(
    {
      kind: 'zoomed',
      scale: next,
      x: point.x - (point.x - now.x) * ratio,
      y: point.y - (point.y - now.y) * ratio,
    },
    picture,
    view,
  )
  return { kind: 'zoomed', ...place }
}

/** The zoom at `factor` times the present scale, about `point`. */
export function zoomBy(
  zoom: PictureZoom,
  picture: PictureSize,
  view: PictureSize,
  factor: number,
  point?: ViewPoint,
): PictureZoom {
  const { scale } = placeOf(zoom, picture, view)
  return zoomTo(zoom, picture, view, scale * factor, point)
}

/** The zoom of Zoom in or Zoom out: the next step, about the middle. */
export function stepZoom(
  zoom: PictureZoom,
  picture: PictureSize,
  view: PictureSize,
  direction: 'in' | 'out',
): PictureZoom {
  const { scale } = placeOf(zoom, picture, view)
  const next =
    direction === 'in'
      ? steps.find((step) => step > scale * 1.001)
      : steps.findLast((step) => step < scale * 0.999)
  return zoomTo(
    zoom,
    picture,
    view,
    next ?? (direction === 'in' ? maxScale : 0),
  )
}

/** The zoom after a move of the picture by `x` and `y` CSS px. */
export function moveBy(
  zoom: PictureZoom,
  picture: PictureSize,
  view: PictureSize,
  move: ViewPoint,
): PictureZoom {
  const now = placeOf(zoom, picture, view)
  if (zoom.kind === 'fit' || now.scale <= fitScale(picture, view)) {
    return fitZoom
  }
  const moved = { ...now, x: now.x + move.x, y: now.y + move.y }
  return {
    kind: 'zoomed',
    ...placeOf({ kind: 'zoomed', ...moved }, picture, view),
  }
}

/**
 * The zoom after a double press: the own size at `point` from a fitted
 * picture, or two times its size when it already shows at its own size.
 * A zoomed picture fits again.
 */
export function toggleZoom(
  zoom: PictureZoom,
  picture: PictureSize,
  view: PictureSize,
  point: ViewPoint,
): PictureZoom {
  const fit = fitScale(picture, view)
  // A zoom that a larger view fits shows fitted, so it zooms in again.
  if (placeOf(zoom, picture, view).scale > fit) return fitZoom
  return zoomTo(fitZoom, picture, view, fit < 1 ? 1 : 2, point)
}

/** The wheel move in CSS px, from a move in lines or in pages. */
function wheelPixels(event: Pick<WheelEvent, 'deltaY' | 'deltaMode'>): number {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * 400
  return event.deltaY
}

/**
 * The zoom factor of one wheel event. A trackpad pinch comes as a wheel
 * event with `ctrlKey`, in small steps, so it zooms faster for each px.
 */
export function wheelFactor(
  event: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>,
): number {
  const limit = event.ctrlKey ? 50 : 200
  const pixels = Math.min(limit, Math.max(-limit, wheelPixels(event)))
  return Math.exp(-pixels * (event.ctrlKey ? 0.01 : 0.002))
}
