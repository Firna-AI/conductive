import { createContext, useContext } from 'react'
import type { PanelWidths } from '../../app/panels'

export const PanelContext = createContext<PanelWidths | null>(null)

/** The widths of the sidebar and the right column, which the browser keeps. */
export function usePanelWidths(): PanelWidths {
  const widths = useContext(PanelContext)
  if (!widths) throw new Error('The app has no panel widths.')
  return widths
}
