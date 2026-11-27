import { useLayoutEffect, useState, type RefObject } from 'react'
import { Store, useStore } from '../../app/store'
import {
  margin,
  measureLayout,
  sameLayout,
  type PopoverLayout,
} from './popover-edges'
import { scrollParent } from './scroll-parent'

/** The space that the phone sheet keeps under the mark that it explains. */
const sheetGap = 12

/** The side of the mark where the panel stands: its start, or its end. */
export type MarkSide = 'start' | 'end'

/**
 * What `placePanel` keeps: the highest height of the panel, and the side of
 * the mark that it tries first, or null for the start.
 */
interface PanelPlace {
  height: number
  side: MarkSide | null
}

/** The browser keeps the popover at its mark through CSS anchor positioning. */
export function anchorsInCss(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('position-anchor: --explain-mark')
  )
}

/**
 * Places the panel by its mark from the boxes of both, as the CSS anchor
 * positioning of the panel would: below the mark, or above it when the
 * frame has more room there, from the start of the mark, and with its end
 * at the end of the mark where it would pass the end of the frame. A panel
 * whose `side` is the end of the mark stays there while it fits. Its
 * height keeps to `height` and to the room on its side of the mark.
 */
function placePanel(
  panel: HTMLElement,
  anchor: HTMLElement,
  place: PanelPlace,
): void {
  const frame = panel.offsetParent
  if (!(frame instanceof HTMLElement)) return
  const outer = frame.getBoundingClientRect()
  const mark = anchor.getBoundingClientRect()
  const below = outer.bottom - mark.bottom - 2 * margin
  const above = mark.top - outer.top - 2 * margin
  const down = below >= above
  const room = down ? below : above
  panel.style.maxHeight = `${Math.max(0, Math.min(place.height, room))}px`
  const width = panel.offsetWidth
  const fitsStart = mark.left + width <= outer.right - margin
  const fitsEnd = mark.right - width >= outer.left + margin
  const atEnd = place.side === 'end' ? fitsEnd || !fitsStart : !fitsStart
  const start = atEnd ? mark.right - width : mark.left
  const most = Math.max(margin, outer.width - width - margin)
  panel.style.left = `${Math.min(Math.max(start - outer.left, margin), most)}px`
  panel.style.top = down ? `${mark.bottom - outer.top}px` : ''
  panel.style.bottom = down ? '' : `${outer.bottom - mark.top}px`
}

/** Takes away the place that `placePanel` gave, so the CSS places the panel. */
function unplace(panel: HTMLElement): void {
  for (const name of ['maxHeight', 'left', 'top', 'bottom'] as const) {
    panel.style[name] = ''
  }
}

/**
 * Places the panel, in a browser without CSS anchor positioning, and keeps
 * its layout in `store`. A layout like the last one changes nothing.
 */
function fit(
  node: HTMLElement,
  anchor: HTMLElement | null,
  place: PanelPlace | null,
  store: Store<PopoverLayout | null>,
): PopoverLayout {
  if (place && anchor) placePanel(node, anchor, place)
  const next = measureLayout(node, anchor)
  if (!sameLayout(store.get(), next)) store.set(next)
  return next
}

/**
 * The frames in a row that look again at a layout that changed. A new
 * layout can move the panel again in the next frame, such as when the page
 * lays its columns out again after a resize of the window.
 */
const settleFrames = 4

/**
 * Keeps the panel of a computer by its mark and finds its layout, while
 * `active`: after each change of the size of the panel or of its mark, each
 * scroll, and each resize of the window, in the next frame, so the callback
 * of the observer changes no layout. A layout that changed is looked at
 * again in the next frame, until it settles. In a browser without CSS
 * anchor positioning, `placePanel` first places the panel with `place`.
 * `measure` finds the layout at once, such as at the start of a move of a
 * handle, or when the pointer or the focus comes into the panel, because
 * the page can move the mark with no event that this hook hears.
 */
export function usePopoverLayout(
  panel: RefObject<HTMLElement | null>,
  anchor: HTMLElement | null,
  active: boolean,
  place: PanelPlace | null,
): { layout: PopoverLayout | null; measure: () => PopoverLayout | null } {
  const [store] = useState(() => new Store<PopoverLayout | null>(null))
  const layout = useStore(store)
  const height = place?.height ?? null
  const side = place?.side ?? null
  useLayoutEffect(() => {
    const node = panel.current
    if (!active || !node) return undefined
    const placed = height === null || !anchor ? null : { height, side }
    let frame = 0
    let settling = 0
    const run = () => {
      frame = 0
      const last = store.get()
      fit(node, anchor, placed, store)
      const changed = store.get() !== last
      settling = changed && settling < settleFrames ? settling + 1 : 0
      if (settling > 0) later()
    }
    const later = () => {
      if (frame === 0) frame = requestAnimationFrame(run)
    }
    run()
    const observer = new ResizeObserver(later)
    observer.observe(node)
    if (anchor) observer.observe(anchor)
    document.addEventListener('scroll', later, true)
    window.addEventListener('resize', later)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('scroll', later, true)
      window.removeEventListener('resize', later)
      if (placed) unplace(node)
    }
  }, [panel, anchor, active, height, side, store])
  const measure = (): PopoverLayout | null => {
    const node = panel.current
    if (!active || !node) return null
    const placed = height === null ? null : { height, side }
    return fit(node, anchor, placed, store)
  }
  return { layout, measure }
}

/**
 * Scrolls the chat so the mark stands in view above the phone sheet, as
 * the sheet opens, and again when its mark first shows, such as just after
 * Explain started its explanation.
 */
export function useMarkAboveSheet(
  sheet: RefObject<HTMLElement | null>,
  anchor: HTMLElement | null,
  active: boolean,
): void {
  useLayoutEffect(() => {
    const node = sheet.current
    const chat = anchor && scrollParent(anchor)
    if (!active || !node || !anchor || !chat) return
    const top = node.getBoundingClientRect().top - sheetGap
    const mark = anchor.getBoundingClientRect()
    const view = chat.getBoundingClientRect()
    if (mark.bottom > top) chat.scrollBy({ top: mark.bottom - top })
    else if (mark.top < view.top + sheetGap)
      chat.scrollBy({ top: mark.top - view.top - sheetGap })
  }, [sheet, anchor, active])
}

/** Puts the top of the sheet at the top of the chat, or back in its CSS. */
function stopSheet(sheet: HTMLElement, chat: HTMLElement | null): void {
  const frame = sheet.offsetParent
  if (!chat || !(frame instanceof HTMLElement)) {
    sheet.style.top = ''
    return
  }
  const top = chat.getBoundingClientRect().top
  sheet.style.top = `${top - frame.getBoundingClientRect().top}px`
}

/**
 * Stops the phone sheet at full height at the top of the chat, just under
 * the tab row, so the tabs stay in view above it.
 */
export function useSheetTop(
  sheet: RefObject<HTMLElement | null>,
  chat: HTMLElement | null,
  full: boolean,
): void {
  useLayoutEffect(() => {
    const node = sheet.current
    if (node) stopSheet(node, full ? chat : null)
  }, [sheet, chat, full])
}
