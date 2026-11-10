import type { RefCallback } from 'react'

/** One ref callback for each key, which keeps the element of that key. */
class Refs {
  private readonly nodes = new Map<string, HTMLElement>()
  private readonly refs = new Map<string, RefCallback<HTMLElement>>()

  ref(key: string): RefCallback<HTMLElement> {
    const known = this.refs.get(key)
    if (known) return known
    const ref: RefCallback<HTMLElement> = (node) => {
      if (node) this.nodes.set(key, node)
      else this.nodes.delete(key)
    }
    this.refs.set(key, ref)
    return ref
  }

  get(key: string): HTMLElement | undefined {
    return this.nodes.get(key)
  }
}

/**
 * The elements of the tabs of one row, by the key of each tab: the list
 * item, which a drag measures and the row scrolls into view, and the link
 * of the tab, a link or a button, which takes the focus back after a move
 * from the tab menu.
 */
export class TabNodes {
  private readonly items = new Refs()
  private readonly links = new Refs()

  /** The ref of the list item of the tab with this key. */
  itemRef(key: string): RefCallback<HTMLElement> {
    return this.items.ref(key)
  }

  /** The ref of the link of the tab with this key. */
  linkRef(key: string): RefCallback<HTMLElement> {
    return this.links.ref(key)
  }

  /** The list item of the tab with this key, while it shows. */
  item(key: string): HTMLElement | undefined {
    return this.items.get(key)
  }

  /** Gives the focus to the link of the tab, and scrolls nothing. */
  focus(key: string): void {
    this.links.get(key)?.focus({ preventScroll: true })
  }

  /**
   * The drop place among the tabs other than the dragged one: before the
   * first one whose middle is right of `x`, else after the last one.
   */
  placeAt(keys: readonly string[], dragged: string, x: number): number {
    const others = keys.filter((key) => key !== dragged)
    const index = others.findIndex((key) => {
      const box = this.items.get(key)?.getBoundingClientRect()
      return box !== undefined && x < box.left + box.width / 2
    })
    return index < 0 ? others.length : index
  }
}
