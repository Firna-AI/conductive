import { createContext, useContext } from 'react'
import type { PanelLayout } from '../../app/panels'

export const PanelContext = createContext<PanelLayout | null>(null)

/**
 * The layout of the panels: the widths of the sidebar and the right
 * column, which the browser keeps, and whether the right column shows.
 */
export function usePanelLayout(): PanelLayout {
  const layout = useContext(PanelContext)
  if (!layout) throw new Error('The app has no panel layout.')
  return layout
}
