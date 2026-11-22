import { useEffect } from 'react'

/** The design token of the height of a screen, as `metrics.ts` names it. */
const screenHeight = '--ui-screen-height'

/**
 * A visual viewport this much shorter than the layout viewport has an
 * on-screen keyboard over it. The margin absorbs rounding of the sizes.
 */
const keyboardMargin = 1

/** The parts of the visual viewport that `followKeyboard` reads. */
interface Viewport {
  readonly height: number
  readonly offsetTop: number
  readonly scale: number
  addEventListener(type: 'resize' | 'scroll', listener: () => void): void
  removeEventListener(type: 'resize' | 'scroll', listener: () => void): void
}

/** The parts of the window that `followKeyboard` reads and changes. */
export interface KeyboardWindow {
  readonly visualViewport: Viewport | null
  readonly scrollY: number
  scrollTo(x: number, y: number): void
  readonly document: {
    readonly documentElement: {
      readonly clientHeight: number
      readonly style: Pick<
        CSSStyleDeclaration,
        'setProperty' | 'removeProperty'
      >
    }
  }
}

/** A pinch zoom also makes the visual viewport shorter. */
function zoomed(viewport: Viewport): boolean {
  return Math.abs(viewport.scale - 1) > 0.01
}

/**
 * Keeps the app in the visible part of the window while an on-screen
 * keyboard shows. Safari on iOS, and Chrome on Android without
 * `interactive-widget=resizes-content`, keep the page at its full height
 * under the keyboard. They then scroll the page up to show the focused
 * field, so the header of the page goes out of view. While the keyboard
 * shows, the screen height token follows the visual viewport and the page
 * stays at its top, so the app ends at the keyboard. A pinch zoom keeps the
 * browser's own behaviour: while the page is zoomed, nothing changes. The
 * function returns the cleanup.
 */
export function followKeyboard(win: KeyboardWindow): () => void {
  const viewport = win.visualViewport
  if (!viewport) return () => undefined
  const root = win.document.documentElement
  let open = false
  const update = () => {
    if (zoomed(viewport)) return
    const covered = root.clientHeight - viewport.height > keyboardMargin
    if (covered) {
      root.style.setProperty(screenHeight, `${viewport.height}px`)
    } else if (open) {
      root.style.removeProperty(screenHeight)
    }
    // Safari can leave the page scrolled after the keyboard goes.
    const moved = win.scrollY !== 0 || viewport.offsetTop !== 0
    if ((covered || open) && moved) win.scrollTo(0, 0)
    open = covered
  }
  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
  update()
  return () => {
    viewport.removeEventListener('resize', update)
    viewport.removeEventListener('scroll', update)
    if (open) root.style.removeProperty(screenHeight)
  }
}

/** Mounts `followKeyboard` on the window for the life of the app. */
export function useKeyboardViewport(): void {
  useEffect(() => followKeyboard(window), [])
}
