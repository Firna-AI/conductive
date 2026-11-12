import { createContext, useContext, useEffect, useRef } from 'react'
import type { PaletteController } from '../../app/palette/controller'
import type { PaletteOffer } from '../../app/palette/page-actions'

/** The command palette of the tab. */
export const PaletteContext = createContext<PaletteController | null>(null)

/** The command palette of the tab. */
export function usePalette(): PaletteController {
  const palette = useContext(PaletteContext)
  if (!palette) throw new Error('The app has no command palette.')
  return palette
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
    return palette.offer({
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
