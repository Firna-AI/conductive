import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { dropdownPlacement } from '@firna/ui/dropdown'
import styles from './ChoiceMenu.module.css'

/** The room between the button and the menu, as the mockups draw it. */
const GUTTER = 4

/** Which edge of the menu lines up with the same edge of its button. */
export type MenuAlign = 'start' | 'end'

/**
 * Places the surface beside its anchor with the dropdown placement of
 * `@firna/ui`: below when it fits, otherwise on the side with more room,
 * clamped to that room. It first measures the size that the surface wants,
 * so the choice of a side uses the real height.
 */
function place(surface: HTMLElement, anchor: HTMLElement, align: MenuAlign) {
  const box = anchor.getBoundingClientRect()
  surface.style.maxHeight = ''
  surface.style.width = ''
  const wanted = surface.getBoundingClientRect()
  const placement = dropdownPlacement(
    { x: box.left, y: box.top, width: box.width, height: box.height },
    {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    },
    { align, gutter: GUTTER },
    wanted.width,
    wanted.height,
  )
  surface.style.left = `${placement.left}px`
  surface.style.top =
    placement.top === undefined ? 'auto' : `${placement.top}px`
  surface.style.bottom =
    placement.bottom === undefined ? 'auto' : `${placement.bottom}px`
  surface.style.width = `${placement.width}px`
  surface.style.maxHeight = `${placement.maxHeight}px`
}

/**
 * The desktop surface of a menu: a manual popover, so it shows in the top
 * layer, and no box with `overflow: hidden` clips it. It stays in the DOM of
 * its anchor, so a press or a key inside it counts as inside the anchor. It
 * shows when it mounts, before the list focuses its marked choice, and it
 * follows the anchor when a page or a box scrolls and when the window
 * resizes. Mount it only while the menu is open.
 */
export function PopoverSurface(props: {
  anchor: RefObject<HTMLElement | null>
  align: MenuAlign
  wide?: boolean
  children: ReactNode
}) {
  const { anchor, align } = props
  const surface = useRef<HTMLDivElement>(null)

  // Layout effects run before the passive effects of the children.
  useLayoutEffect(() => {
    const element = surface.current
    if (!element) return
    element.showPopover()
    return () => {
      if (element.matches(':popover-open')) element.hidePopover()
    }
  }, [])

  // The content can change size with each render, such as a loaded list.
  useLayoutEffect(() => {
    if (surface.current && anchor.current) {
      place(surface.current, anchor.current, align)
    }
  })

  useEffect(() => {
    function follow(event: Event) {
      const element = surface.current
      const target = event.target
      if (!element || !anchor.current) return
      // A scroll of the choices inside the menu does not move the anchor.
      if (target instanceof Node && element.contains(target)) return
      place(element, anchor.current, align)
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [anchor, align])

  return (
    <div
      className={props.wide ? `${styles.menu} ${styles.wide}` : styles.menu}
      popover="manual"
      ref={surface}
    >
      {props.children}
    </div>
  )
}
