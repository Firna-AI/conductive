import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type RefCallback,
} from 'react'
import type { PaletteController } from '../../app/palette/controller'
import type { PaletteOffer } from '../../app/palette/page-actions'

/** The command palette of the tab, and the terminals of the page. */
export interface PaletteHandle {
  readonly controller: PaletteController
  /** The elements of the terminals, where Ctrl+K goes to the terminal. */
  readonly terminals: Set<HTMLElement>
}

export const PaletteContext = createContext<PaletteHandle | null>(null)

/** The command palette of the tab. */
export function usePalette(): PaletteController {
  const palette = useContext(PaletteContext)
  if (!palette) throw new Error('The app has no command palette.')
  return palette.controller
}

/** The rows that an offer makes, without what their runs do. */
function offerShape(offer: PaletteOffer): string {
  const rows = offer.actions.map((action) => [action.id, action.href ?? null])
  return JSON.stringify({ scope: offer.scope, rows })
}

/**
 * Offers the actions of a part of the page to the palette while the part
 * shows. `null` offers nothing. A run calls the action of the latest
 * render, so a new render offers again only when the rows change.
 */
export function usePaletteOffer(offer: PaletteOffer | null): void {
  const palette = useContext(PaletteContext)
  const latest = useRef(offer)
  useEffect(() => {
    latest.current = offer
  })
  const shape = offer === null ? null : offerShape(offer)
  useEffect(() => {
    const current = latest.current
    if (!palette || shape === null || current === null) return undefined
    return palette.controller.offer({
      scope: current.scope,
      actions: current.actions.map((action) => ({
        id: action.id,
        href: action.href,
        run: () =>
          latest.current?.actions.find((item) => item.id === action.id)?.run(),
      })),
    })
  }, [palette, shape])
}

/**
 * The ref of the element of a terminal, which its owner gives. Ctrl+K in
 * that element goes to the terminal, because shells use it to delete to
 * the end of the line. On a Mac, ⌘K still opens the palette there.
 */
export function usePaletteTerminal(): RefCallback<HTMLElement> {
  const palette = useContext(PaletteContext)
  return useCallback(
    (element: HTMLElement | null) => {
      if (!element || !palette) return undefined
      palette.terminals.add(element)
      return () => {
        palette.terminals.delete(element)
      }
    },
    [palette],
  )
}
