import {
  rightColumnWidth,
  sidebarWidth,
  type PanelWidth,
} from '../ui/components/layout/ResizeHandle'
import { ColumnSplit } from './column-split'
import { ExplainSize } from './explain-size'
import { moveInRange, type PanelDrag, type PanelMove } from './panel-drag'
import type { KeyValueStorage } from './services'
import { derived, Store, type Readable } from './store'
import { StoredSize, wholePx } from './stored-size'

export type Panel = 'sidebar' | 'right'

/** The default width and the range of each panel that the user drags. */
export const panelRanges: Readonly<Record<Panel, PanelWidth>> = {
  sidebar: sidebarWidth,
  right: rightColumnWidth,
}

const storageKeys: Readonly<Record<Panel, string>> = {
  sidebar: 'conductive.sidebar-width',
  right: 'conductive.right-width',
}

/** `null` means that the user has not chosen a width, so the layout's own applies. */
export type PanelState = Readonly<Record<Panel, number | null>>

/**
 * The layout of the panels that the user chooses: the widths of the
 * sidebar and the right column, the split of the right column between the
 * file lists and the tools, the size of the Explain popovers, and whether
 * the sidebar and the right column show. The browser keeps the widths, the
 * split, and the size of the popovers through `StoredSize`. When the
 * browser refuses its storage, they last until the page closes. Whether the
 * sidebar and the right column show always lasts until the page closes.
 */
export class PanelLayout {
  readonly widths: Readable<PanelState>
  /**
   * The right column shows. The toggle at the end of the workspace header
   * hides it and shows it again, for every workspace of the tab.
   */
  readonly rightShown = new Store(true)
  /**
   * The sidebar of the org shows. Its toggle hides it and shows it again,
   * in the browser and in the Mac app.
   */
  readonly sidebarShown = new Store(true)
  /** The split of the right column between the file lists and the tools. */
  readonly split: ColumnSplit
  /** The size of the Explain popovers, which the member chooses with their handles. */
  readonly explain: ExplainSize
  private readonly sizes: Readonly<Record<Panel, StoredSize>>

  constructor(storage: KeyValueStorage | null) {
    this.split = new ColumnSplit(storage)
    this.explain = new ExplainSize(storage)
    const stored = (panel: Panel) =>
      new StoredSize(storage, storageKeys[panel], wholePx(panelRanges[panel]))
    this.sizes = { sidebar: stored('sidebar'), right: stored('right') }
    this.widths = derived(
      this.sizes.sidebar.chosen,
      this.sizes.right.chosen,
      (sidebar, right) => ({ sidebar, right }),
    )
  }

  /** The width now: the user's, or the default of the panel. */
  width(panel: Panel): number {
    return this.sizes[panel].chosen.get() ?? panelRanges[panel].value
  }

  /** Hides the sidebar, or shows it again. */
  toggleSidebar = (): void => {
    this.sidebarShown.change((shown) => !shown)
  }

  /** Hides the right column, or shows it again. */
  toggleRight = (): void => {
    this.rightShown.change((shown) => !shown)
  }

  /**
   * The width after a move from `from`, the width that the panel shows, as
   * `moveInRange` says. The keys and the drag all use this one rule.
   */
  next(panel: Panel, from: number, move: PanelMove): number {
    return moveInRange(panelRanges[panel], from, move)
  }

  /** One step of the keys. A step that ends at `from` changes and stores nothing. */
  step(panel: Panel, from: number, move: PanelMove): void {
    this.sizes[panel].step(Math.round(from), this.next(panel, from, move))
  }

  /**
   * One drag from `from`. Each move shows its width at once, and the end
   * stores the last one. A drag that ends where it started gets back the
   * width from before the drag, and stores nothing.
   */
  drag(panel: Panel, from: number): PanelDrag {
    return this.sizes[panel].drag(Math.round(from), (by) =>
      this.next(panel, from, { by }),
    )
  }
}
