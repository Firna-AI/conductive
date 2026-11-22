import { useLayoutEffect, type RefObject } from 'react'
import { scrollParent } from './scroll-parent'

/** The space between the popover and its mark, and the edge of the frame. */
const margin = 6

/** The highest height of the popover on a computer. */
const highest = 420

/** The space that the phone sheet keeps under the mark that it explains. */
const sheetGap = 12

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
 * at the end of the mark where it would pass the end of the frame. Its
 * height keeps to the room on its side of the mark.
 */
function placePanel(panel: HTMLElement, anchor: HTMLElement): void {
  const frame = panel.offsetParent
  if (!(frame instanceof HTMLElement)) return
  const outer = frame.getBoundingClientRect()
  const mark = anchor.getBoundingClientRect()
  const below = outer.bottom - mark.bottom - 2 * margin
  const above = mark.top - outer.top - 2 * margin
  const down = below >= above
  panel.style.maxHeight = `${Math.max(0, Math.min(highest, down ? below : above))}px`
  const width = panel.offsetWidth
  const start =
    mark.left + width > outer.right - margin ? mark.right - width : mark.left
  const most = Math.max(margin, outer.width - width - margin)
  panel.style.left = `${Math.min(Math.max(start - outer.left, margin), most)}px`
  panel.style.top = down ? `${mark.bottom - outer.top}px` : ''
  panel.style.bottom = down ? '' : `${outer.bottom - mark.top}px`
}

/**
 * Keeps the panel at its mark while the chat scrolls and the window or the
 * panel changes size, in a browser without CSS anchor positioning.
 */
export function usePanelPlace(
  panel: RefObject<HTMLElement | null>,
  anchor: HTMLElement | null,
  active: boolean,
): void {
  useLayoutEffect(() => {
    const node = panel.current
    if (!active || !node || !anchor) return undefined
    let frame = 0
    const place = () => {
      frame = 0
      placePanel(node, anchor)
    }
    const later = () => {
      if (frame === 0) frame = requestAnimationFrame(place)
    }
    place()
    const observer = new ResizeObserver(later)
    observer.observe(node)
    document.addEventListener('scroll', later, true)
    window.addEventListener('resize', later)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('scroll', later, true)
      window.removeEventListener('resize', later)
    }
  }, [panel, anchor, active])
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
