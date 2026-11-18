import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  dropdownPlacement,
  type DropdownPlacement,
  type DropdownPlacementOptions,
} from '@firna/ui/dropdown'

/** The room between the button and the menu, as the mockups draw it. */
const GUTTER = 4

/** Which edge of the menu lines up with the same edge of its button. */
export type MenuAlign = 'start' | 'end'

/** The side of its button where a menu opens when it fits there. */
export type MenuSide = 'below' | 'above'

/** A box of the window, in CSS px, as `getBoundingClientRect` gives it. */
interface Box {
  left: number
  top: number
  bottom: number
  width: number
  height: number
}

/** How a surface takes its place beside its anchor. */
export interface Setup {
  align: MenuAlign
  side: MenuSide
  options?: Omit<DropdownPlacementOptions, 'align'>
}

/**
 * The placement of `@firna/ui` for a surface of the `wanted` size. Firna
 * prefers the side below the anchor. For a surface that prefers the side
 * above, it places the surface in a mirror image of the window, and the
 * result turns back: its top becomes the bottom.
 */
export function surfacePlacement(
  box: Box,
  wanted: { width: number; height: number },
  room: { width: number; height: number },
  setup: Setup,
): DropdownPlacement {
  const options = { gutter: GUTTER, ...setup.options, align: setup.align }
  const above = setup.side === 'above'
  const anchor = {
    x: box.left,
    y: above ? room.height - box.bottom : box.top,
    width: box.width,
    height: box.height,
  }
  const at = dropdownPlacement(
    anchor,
    room,
    options,
    wanted.width,
    wanted.height,
  )
  if (!above) return at
  return {
    ...at,
    side: at.side === 'bottom' ? 'top' : 'bottom',
    top: at.bottom,
    bottom: at.top,
  }
}

/**
 * Places the surface beside its anchor with the dropdown placement of
 * `@firna/ui`: on its side when it fits, otherwise on the side with more
 * room, clamped to that room. It first measures the size that the surface
 * wants, so the choice of a side uses the real height.
 */
function place(surface: HTMLElement, anchor: HTMLElement, setup: Setup) {
  surface.style.maxHeight = ''
  surface.style.width = ''
  const room = {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }
  const at = surfacePlacement(
    anchor.getBoundingClientRect(),
    surface.getBoundingClientRect(),
    room,
    setup,
  )
  surface.style.left = `${at.left}px`
  surface.style.top = at.top === undefined ? 'auto' : `${at.top}px`
  surface.style.bottom = at.bottom === undefined ? 'auto' : `${at.bottom}px`
  surface.style.width = `${at.width}px`
  surface.style.maxHeight = `${at.maxHeight}px`
}

/**
 * The desktop surface of a menu: a manual popover, so it shows in the top
 * layer, and no box with `overflow: hidden` clips it. It stays in the DOM of
 * its anchor, so a press or a key inside it counts as inside the anchor. It
 * shows when it mounts, before the list focuses its marked choice, and it
 * follows the anchor when a page or a box scrolls and when the window
 * resizes. A browser without the Popover API, such as happy-dom in tests,
 * shows it in place. Mount it only while the menu is open.
 *
 * `className` gives the style of the surface. It must replace the browser's
 * popover style, and show the surface only while `:popover-open`.
 * `options` go to the placement of `@firna/ui`, such as a `maxHeight`.
 */
export function PopoverSurface(props: {
  anchor: RefObject<HTMLElement | null>
  align: MenuAlign
  side?: MenuSide
  options?: Omit<DropdownPlacementOptions, 'align'>
  className: string
  children: ReactNode
}) {
  const { anchor } = props
  const surface = useRef<HTMLDivElement>(null)
  const setup = useRef<Setup>({ align: props.align, side: 'below' })
  useLayoutEffect(() => {
    setup.current = {
      align: props.align,
      side: props.side ?? 'below',
      options: props.options,
    }
  })

  // Layout effects run before the passive effects of the children.
  useLayoutEffect(() => {
    const element = surface.current
    if (!element || !('showPopover' in element)) return
    element.showPopover()
    return () => {
      if (element.matches(':popover-open')) element.hidePopover()
    }
  }, [])

  // The content can change size with each render, such as a loaded list.
  useLayoutEffect(() => {
    if (surface.current && anchor.current) {
      place(surface.current, anchor.current, setup.current)
    }
  })

  useEffect(() => {
    function follow(event: Event) {
      const element = surface.current
      const target = event.target
      if (!element || !anchor.current) return
      // A scroll of the choices inside the menu does not move the anchor.
      if (target instanceof Node && element.contains(target)) return
      place(element, anchor.current, setup.current)
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [anchor])

  return (
    <div className={props.className} popover="manual" ref={surface}>
      {props.children}
    </div>
  )
}
