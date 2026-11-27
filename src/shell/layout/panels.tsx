import { createContext, useContext, useState } from 'react'
import { ExplainSize } from '../../app/explain-size'
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

/**
 * The size of the Explain popovers that the member chose, which the panel
 * layout keeps in the browser. A screen without the panel layout, such as
 * the chat development page or a test of the chat, keeps a size of its own
 * until it closes.
 */
export function useExplainSize(): ExplainSize {
  const layout = useContext(PanelContext)
  const [own] = useState(() => new ExplainSize(null))
  return layout?.explain ?? own
}
