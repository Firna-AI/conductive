type ElementRef = (node: HTMLElement | null) => void

/**
 * The boxes of the Merge queue group that a drag of an entry measures. The
 * group gives each block and each row to the layout through a callback
 * ref, so the drag reads only the elements of its own list.
 */
export class QueueLayout {
  private readonly blocks = new Map<string, HTMLElement>()
  private readonly rows = new Map<
    string,
    { repositoryId: string; unit: string; element: HTMLElement }
  >()

  /** The ref of the block of the queue of a repository. */
  block(repositoryId: string): ElementRef {
    return (node) => {
      if (node) this.blocks.set(repositoryId, node)
      else this.blocks.delete(repositoryId)
    }
  }

  /**
   * The ref of the row of an entry. `unit` names its unit: the workspace of
   * the first entry of its member stack, or its own for an entry alone.
   */
  row(workspaceId: string, repositoryId: string, unit: string): ElementRef {
    return (node) => {
      if (node)
        this.rows.set(workspaceId, { repositoryId, unit, element: node })
      else if (this.rows.get(workspaceId)?.repositoryId === repositoryId) {
        this.rows.delete(workspaceId)
      }
    }
  }

  /**
   * The place of a dragged unit under the pointer: the index before the
   * first other unit of its block whose middle is below it, counted
   * without the dragged unit. A pointer outside the visible block has no
   * drop place.
   */
  indexAt(
    repositoryId: string,
    unit: string,
    x: number,
    y: number,
  ): number | null {
    if (
      !this.blocks.get(repositoryId)?.contains(document.elementFromPoint(x, y))
    )
      return null
    const units = new Map<string, { top: number; bottom: number }>()
    for (const row of this.rows.values()) {
      if (row.repositoryId !== repositoryId || row.unit === unit) continue
      const box = row.element.getBoundingClientRect()
      const known = units.get(row.unit)
      units.set(row.unit, {
        top: Math.min(known?.top ?? box.top, box.top),
        bottom: Math.max(known?.bottom ?? box.bottom, box.bottom),
      })
    }
    const middles = [...units.values()]
      .map(({ top, bottom }) => (top + bottom) / 2)
      .sort((a, b) => a - b)
    const index = middles.findIndex((middle) => y < middle)
    return index === -1 ? middles.length : index
  }
}
