import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
} from 'react'
import type { PictureSize } from '../../ui/components/files/ImageView'
import {
  fitScale,
  fitZoom,
  maxScale,
  moveBy,
  placeOf,
  stepZoom,
  toggleZoom,
  wheelFactor,
  zoomBy,
  zoomTo,
  type PicturePlace,
  type PictureZoom,
  type ViewPoint,
} from './picture-zoom'

/** The pinch of Safari on a Mac trackpad, which sends no wheel event. */
interface GestureEvent extends UIEvent {
  scale: number
  clientX: number
  clientY: number
}

/** The zoom of one picture view, with the handlers of its stage. */
export interface PictureZoomView {
  /** Takes the stage: the part of the view that shows the picture. */
  stageRef: (stage: HTMLDivElement | null) => void
  /** Where the picture shows, or null before the view has a size. */
  place: PicturePlace | null
  fitted: boolean
  /** The picture is larger than the stage, so a drag moves it. */
  movable: boolean
  dragging: boolean
  canZoomIn: boolean
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void
    onDoubleClick: (event: MouseEvent<HTMLDivElement>) => void
  }
}

/** A point of the screen in CSS px from the middle of `stage`. */
function pointIn(stage: HTMLElement, x: number, y: number): ViewPoint {
  const box = stage.getBoundingClientRect()
  return { x: x - box.left - box.width / 2, y: y - box.top - box.height / 2 }
}

/** The distance between two points and the point between them. */
function spread(points: ViewPoint[]): { distance: number; middle: ViewPoint } {
  const [a, b] = points
  return {
    distance: Math.hypot(a.x - b.x, a.y - b.y),
    middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  }
}

/**
 * The zoom of a picture of size `picture` in its stage. The wheel and a
 * pinch on a trackpad or a touch screen zoom about the pointer. A drag
 * moves a zoomed picture, and a double press zooms in, or fits a zoomed
 * picture again. A new picture fits again.
 */
export function usePictureZoom(picture: PictureSize): PictureZoomView {
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [view, setView] = useState<PictureSize | null>(null)
  const [zoom, setZoom] = useState<PictureZoom>(fitZoom)
  const [shown, setShown] = useState(picture)
  const pointers = useRef(new Map<number, ViewPoint>())
  const [dragging, setDragging] = useState(false)
  if (shown !== picture) {
    setShown(picture)
    setZoom(fitZoom)
  }
  // The latest sizes for the handlers, which keep one identity.
  const sizes = useRef({ picture, view, zoom })
  useEffect(() => {
    sizes.current = { picture, view, zoom }
  })
  const change = useCallback(
    (
      next: (
        zoom: PictureZoom,
        picture: PictureSize,
        view: PictureSize,
      ) => PictureZoom,
    ) => {
      const { picture: size, view: room } = sizes.current
      if (room) setZoom((zoom) => next(zoom, size, room))
    },
    [],
  )
  useEffect(() => {
    if (!stage) return undefined
    // A stage without a size, such as one that is hidden, places nothing.
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = stage
      setView(width > 0 && height > 0 ? { width, height } : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    let gestureScale = 1
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const point = pointIn(stage, event.clientX, event.clientY)
      change((zoom, size, room) =>
        zoomBy(zoom, size, room, wheelFactor(event), point),
      )
    }
    // Safari on iOS also sends the pointers of a pinch, which zoom already.
    const touching = () => pointers.current.size >= 2
    const onGestureStart = (event: Event) => {
      event.preventDefault()
      if (touching()) return
      const { picture: size, view: room, zoom: now } = sizes.current
      gestureScale = room ? placeOf(now, size, room).scale : 1
    }
    const onGestureChange = (event: Event) => {
      event.preventDefault()
      if (touching()) return
      const gesture = event as GestureEvent
      // A gesture without a place zooms about the middle.
      const placed =
        Number.isFinite(gesture.clientX) && Number.isFinite(gesture.clientY)
      const point = placed
        ? pointIn(stage, gesture.clientX, gesture.clientY)
        : undefined
      change((zoom, size, room) =>
        zoomTo(zoom, size, room, gestureScale * gesture.scale, point),
      )
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('gesturestart', onGestureStart)
    stage.addEventListener('gesturechange', onGestureChange)
    return () => {
      observer.disconnect()
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('gesturestart', onGestureStart)
      stage.removeEventListener('gesturechange', onGestureChange)
    }
  }, [stage, change])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (!stage) return
    stage.setPointerCapture?.(event.pointerId)
    pointers.current.set(
      event.pointerId,
      pointIn(stage, event.clientX, event.clientY),
    )
    setDragging(true)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId)
    if (!last || !stage) return
    const before = [...pointers.current.values()]
    const point = pointIn(stage, event.clientX, event.clientY)
    pointers.current.set(event.pointerId, point)
    const after = [...pointers.current.values()]
    if (after.length === 1) {
      const move = { x: point.x - last.x, y: point.y - last.y }
      change((zoom, size, room) => moveBy(zoom, size, room, move))
      return
    }
    if (after.length !== 2) return
    const from = spread(before)
    const to = spread(after)
    if (from.distance === 0) return
    // The spot between the fingers stays between them: a zoom about the
    // old middle, then a move to the new middle.
    change((zoom, size, room) => {
      const zoomed = zoomBy(
        zoom,
        size,
        room,
        to.distance / from.distance,
        from.middle,
      )
      return moveBy(zoomed, size, room, {
        x: to.middle.x - from.middle.x,
        y: to.middle.y - from.middle.y,
      })
    })
  }
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (stage?.hasPointerCapture?.(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId)
    }
    if (pointers.current.size === 0) setDragging(false)
  }
  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!stage) return
    const point = pointIn(stage, event.clientX, event.clientY)
    change((zoom, size, room) => toggleZoom(zoom, size, room, point))
  }

  const place = view ? placeOf(zoom, picture, view) : null
  const fitted = !view || place?.scale === fitScale(picture, view)
  return {
    stageRef: setStage,
    place,
    fitted,
    movable:
      place !== null &&
      view !== null &&
      (picture.width * place.scale > view.width ||
        picture.height * place.scale > view.height),
    dragging,
    canZoomIn: place !== null && place.scale < maxScale,
    zoomIn: () =>
      change((zoom, size, room) => stepZoom(zoom, size, room, 'in')),
    zoomOut: () =>
      change((zoom, size, room) => stepZoom(zoom, size, room, 'out')),
    fit: () => setZoom(fitZoom),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onDoubleClick,
    },
  }
}
