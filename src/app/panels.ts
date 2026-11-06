import {
  rightColumnWidth,
  sidebarWidth,
  type PanelWidth,
} from '../../docs/mockups/src/components/layout/ResizeHandle'
import type { KeyValueStorage } from './services'
import { Store } from './store'

export type Panel = 'sidebar' | 'right'

/** The default width and the range of each panel that the user drags. */
export const panelRanges: Readonly<Record<Panel, PanelWidth>> = {
  sidebar: sidebarWidth,
  right: rightColumnWidth,
}

const storageKeys: Readonly<Record<Panel, string>> = {
  sidebar: 'conducting.sidebar-width',
  right: 'conducting.right-width',
}

/** A width in the range of its panel, in whole px. */
export function clampWidth(panel: Panel, value: number): number {
  const range = panelRanges[panel]
  return Math.min(range.max, Math.max(range.min, Math.round(value)))
}

/** `null` means that the user has not chosen a width, so the layout's own applies. */
export type PanelState = Readonly<Record<Panel, number | null>>

function readWidth(storage: KeyValueStorage | null, panel: Panel) {
  let stored: string | null
  try {
    stored = storage?.getItem(storageKeys[panel]) ?? null
  } catch {
    return null
  }
  if (stored === null || !/^\d+$/.test(stored)) return null
  return clampWidth(panel, Number(stored))
}

/**
 * The widths of the sidebar and the right column. The browser keeps them,
 * as the only state that does not come from the Worker. When the browser
 * refuses its storage, the widths last until the page closes.
 */
export class PanelWidths {
  readonly widths: Store<PanelState>
  private readonly storage: KeyValueStorage | null

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
    this.widths = new Store<PanelState>({
      sidebar: readWidth(storage, 'sidebar'),
      right: readWidth(storage, 'right'),
    })
  }

  /** The width now: the user's, or the default of the panel. */
  width(panel: Panel): number {
    return this.widths.get()[panel] ?? panelRanges[panel].value
  }

  /** Sets a width. A drag saves only its last width, as `save: false` says. */
  set(panel: Panel, value: number, options: { save?: boolean } = {}): void {
    const width = clampWidth(panel, value)
    this.widths.change((current) => ({ ...current, [panel]: width }))
    if (options.save === false) return
    try {
      this.storage?.setItem(storageKeys[panel], String(width))
    } catch {
      // The width still applies while the page stays open.
    }
  }
}
