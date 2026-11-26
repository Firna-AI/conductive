import { createContext, useContext } from 'react'
import type { PanelLayout } from '../../app/panels'
import { useStore, type Readable } from '../../app/store'

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

/** A right column that always shows, for a screen without the layout. */
const shownAlways: Readable<boolean> = {
  get: () => true,
  subscribe: () => () => undefined,
}

/**
 * Whether the right column shows. A screen without the panel layout has
 * no right column to hide, so it reads true.
 */
export function useRightShown(): boolean {
  const layout = useContext(PanelContext)
  return useStore(layout?.rightShown ?? shownAlways)
}
