/** Where a dragged workspace lands: a section, and an index in it. */
export interface DropTarget {
  sectionId: string
  /** The place in the section, counted without the moved workspace. */
  index: number
}

type ElementRef = (node: HTMLElement | null) => void

/**
 * The boxes of one list that a drag of a row or of a section measures.
 * The list gives each section and each row to the layout through a
 * callback ref, so the drag reads only the elements of its own list.
 */
export class DropLayout {
  private readonly sections = new Map<string, HTMLElement>()
  private readonly rows = new Map<
    string,
    { sectionId: string; element: HTMLElement }
  >()

  section(sectionId: string): ElementRef {
    return (node) => {
      if (node) this.sections.set(sectionId, node)
      else this.sections.delete(sectionId)
    }
  }

  row(workspaceId: string, sectionId: string): ElementRef {
    return (node) => {
      if (node) this.rows.set(workspaceId, { sectionId, element: node })
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
   * The drop place under the pointer: the section whose box holds it, and
   * the index before the first row whose middle is below it.
   */
  targetAt(workspaceId: string, y: number): DropTarget | null {
    const hit = [...this.sections].find(([, element]) => {
      const box = element.getBoundingClientRect()
      return box.height > 0 && y >= box.top && y <= box.bottom
    })
    if (!hit) return null
    const [sectionId] = hit
    const middles = [...this.rows]
      .filter(([id, row]) => id !== workspaceId && row.sectionId === sectionId)
      .map(([, row]) => {
        const box = row.element.getBoundingClientRect()
        return box.top + box.height / 2
      })
      .sort((a, b) => a - b)
    const index = middles.findIndex((middle) => y < middle)
    return { sectionId, index: index === -1 ? middles.length : index }
  }
}
