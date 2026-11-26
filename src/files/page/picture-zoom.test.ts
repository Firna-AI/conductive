import { describe, expect, it } from 'vitest'
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
  type PictureZoom,
} from './picture-zoom'

// A wide screenshot in a stage that fits it at a quarter of its size.
const picture = { width: 1600, height: 800 }
const view = { width: 432, height: 400 }
const fit = 0.25

describe('picture zoom', () => {
  it('fits a picture to the stage inside its padding, and never past its own size', () => {
    expect(fitScale(picture, view)).toBe(fit)
    expect(fitScale({ width: 40, height: 20 }, view)).toBe(1)
    expect(placeOf(fitZoom, picture, view)).toEqual({ scale: fit, x: 0, y: 0 })
  })

  it('zooms about a point, so the spot under the pointer stays under it', () => {
    const point = { x: 100, y: -50 }
    const zoom = zoomTo(fitZoom, picture, view, 1, point)
    const place = placeOf(zoom, picture, view)
    // The spot of the picture under the point, in its own px, stays the same.
    const before = { x: point.x / fit, y: point.y / fit }
    const after = {
      x: (point.x - place.x) / place.scale,
      y: (point.y - place.y) / place.scale,
    }
    expect(place.scale).toBe(1)
    expect(after).toEqual(before)
  })

  it('keeps a zoomed picture over the stage, and a side that fits in the middle', () => {
    const zoom: PictureZoom = { kind: 'zoomed', scale: 0.4, x: 9000, y: 9000 }
    // 640 × 320 in a stage of 432 × 400: the width moves, the height fits.
    expect(placeOf(zoom, picture, view)).toEqual({ scale: 0.4, x: 104, y: 0 })
  })

  it('fits again at or under the fit scale, and stops at the largest scale', () => {
    expect(zoomTo(fitZoom, picture, view, 0.2)).toEqual(fitZoom)
    const zoomed = zoomBy(fitZoom, picture, view, 1000)
    expect(placeOf(zoomed, picture, view).scale).toBe(maxScale)
  })

  it('steps through the fixed scales, and fits after the last step out', () => {
    const half = stepZoom(fitZoom, picture, view, 'in')
    expect(placeOf(half, picture, view).scale).toBe(0.5)
    const three = stepZoom(half, picture, view, 'in')
    expect(placeOf(three, picture, view).scale).toBe(0.75)
    expect(stepZoom(half, picture, view, 'out')).toEqual(fitZoom)
    const largest = zoomTo(fitZoom, picture, view, maxScale)
    expect(stepZoom(largest, picture, view, 'in')).toEqual(largest)
  })

  it('moves only a zoomed picture, inside the stage', () => {
    expect(moveBy(fitZoom, picture, view, { x: 50, y: 50 })).toEqual(fitZoom)
    const zoomed = zoomTo(fitZoom, picture, view, 1)
    const moved = moveBy(zoomed, picture, view, { x: -10_000, y: 30 })
    expect(placeOf(moved, picture, view)).toEqual({
      scale: 1,
      x: -(1600 - 432) / 2,
      y: 30,
    })
  })

  it('switches between the fit and the own size at a double press', () => {
    const own = toggleZoom(fitZoom, picture, view, { x: 0, y: 0 })
    expect(placeOf(own, picture, view).scale).toBe(1)
    expect(toggleZoom(own, picture, view, { x: 0, y: 0 })).toEqual(fitZoom)
    // A picture that fits at its own size zooms to two times its size.
    const small = { width: 40, height: 20 }
    const two = toggleZoom(fitZoom, small, view, { x: 0, y: 0 })
    expect(placeOf(two, small, view).scale).toBe(2)
  })

  it('zooms in at a double press when a larger stage fits the zoomed picture', () => {
    const zoomed = zoomTo(fitZoom, picture, view, 0.5)
    const larger = { width: 3232, height: 1632 }
    const again = toggleZoom(zoomed, picture, larger, { x: 0, y: 0 })
    expect(placeOf(again, picture, larger).scale).toBe(2)
  })

  it('zooms in as the wheel turns away, and a pinch zooms faster for each px', () => {
    const notch = { deltaY: -100, deltaMode: 0, ctrlKey: false }
    expect(wheelFactor(notch)).toBeCloseTo(Math.exp(0.2))
    expect(wheelFactor({ ...notch, deltaY: 100 })).toBeCloseTo(Math.exp(-0.2))
    // Three lines are 48 px.
    const lines = { deltaY: -3, deltaMode: 1, ctrlKey: false }
    expect(wheelFactor(lines)).toBeCloseTo(Math.exp(0.096))
    const pinch = { deltaY: -10, deltaMode: 0, ctrlKey: true }
    expect(wheelFactor(pinch)).toBeCloseTo(Math.exp(0.1))
    // A large jump zooms only a limited step.
    const jump = { deltaY: -5000, deltaMode: 0, ctrlKey: false }
    expect(wheelFactor(jump)).toBeCloseTo(Math.exp(0.4))
  })
})
