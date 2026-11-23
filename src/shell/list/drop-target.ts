/** Where a dragged tree lands: a section, and an index in it. */
export interface DropTarget {
  sectionId: string
  /**
   * The place in the section among its top-level rows, counted without the
   * moved one.
   */
  index: number
}

/** A row of a section over the Merge queue group, which a drop adds. */
export interface QueuePlace {
  readonly queue: true
}

/** The one place of the Merge queue group, so that a move keeps it. */
export const intoQueue: QueuePlace = { queue: true }

/** Where a dragged row of a section lands: a section, or the merge queue. */
export type RowPlace = DropTarget | QueuePlace

export function isQueuePlace(place: RowPlace): place is QueuePlace {
  return 'queue' in place
}

type ElementRef = (node: HTMLElement | null) => void

/**
 * The boxes of one list that a drag of a row or of a section measures.
 * The list gives each section and each row to the layout through a
 * callback ref, so the drag reads only the elements of its own list.
 */
export class DropLayout {
  private queueGroup: HTMLElement | null = null
  private readonly sections = new Map<string, HTMLElement>()
  private readonly rows = new Map<
    string,
    { sectionId: string; treeId: string; element: HTMLElement }
  >()

  /** The ref of the Merge queue group, while it shows. */
  readonly group: ElementRef = (node) => {
    this.queueGroup = node
  }

  /** Whether the pointer is over the Merge queue group. */
  inGroup(hit: Element | null): boolean {
    return this.queueGroup?.contains(hit) ?? false
  }

  section(sectionId: string): ElementRef {
    return (node) => {
      if (node) this.sections.set(sectionId, node)
      else this.sections.delete(sectionId)
    }
  }

  /**
   * The ref of the row of a workspace. `treeId` is the workspace of the
   * top-level row of its tree: its own for a top-level row.
   */
  row(workspaceId: string, sectionId: string, treeId: string): ElementRef {
    return (node) => {
      if (node) this.rows.set(workspaceId, { sectionId, treeId, element: node })
      else if (this.rows.get(workspaceId)?.sectionId === sectionId) {
        this.rows.delete(workspaceId)
      }
    }
  }

  /**
   * The place of a dragged section under the pointer: the index before the
   * first other section whose middle is below it. The index counts the
   * sections without the dragged one.
   */
  sectionIndexAt(sectionId: string, y: number): number {
    const middles = [...this.sections]
      .filter(([id]) => id !== sectionId)
      .map(([, element]) => {
        const box = element.getBoundingClientRect()
        return box.top + box.height / 2
      })
      .sort((a, b) => a - b)
    const index = middles.findIndex((middle) => y < middle)
    return index === -1 ? middles.length : index
  }

  /**
   * The drop place of a dragged tree under the pointer: the section whose
   * box holds it, and the index before the first other tree whose middle
   * is below it. A tree spans its top-level row and each row nested under
   * it, so a drop never falls between two rows of one tree.
   */
  targetAt(
    workspaceId: string,
    hit: Element | null,
    y: number,
  ): DropTarget | null {
    const section = [...this.sections].find(([, element]) =>
      element.contains(hit),
    )
    if (!section) return null
    const [sectionId] = section
    const trees = new Map<string, { top: number; bottom: number }>()
    for (const row of this.rows.values()) {
      if (row.sectionId !== sectionId || row.treeId === workspaceId) continue
      const box = row.element.getBoundingClientRect()
      const tree = trees.get(row.treeId)
      trees.set(row.treeId, {
        top: Math.min(tree?.top ?? box.top, box.top),
        bottom: Math.max(tree?.bottom ?? box.bottom, box.bottom),
      })
    }
    const middles = [...trees.values()]
      .map(({ top, bottom }) => (top + bottom) / 2)
      .sort((a, b) => a - b)
    const index = middles.findIndex((middle) => y < middle)
    return { sectionId, index: index === -1 ? middles.length : index }
  }
}
