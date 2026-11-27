import { useState, type RefCallback } from 'react'
import { usePointerDrag, type PointerDragProps } from '../../app/pointer-drag'
import { useEscapeLayer } from './escape-layer'

/** An item of a list that moves by drag: its ID and its spoken name. */
export interface MovableItem {
  id: string
  name: string
}

/** The list items of one list, which a drag measures. */
class ListItems {
  private readonly nodes = new Map<string, HTMLElement>()
  private readonly refs = new Map<string, RefCallback<HTMLElement>>()

  /** The ref of the list item of an item. It stays the same between renders. */
  ref(id: string): RefCallback<HTMLElement> {
    const known = this.refs.get(id)
    if (known) return known
    const ref: RefCallback<HTMLElement> = (node) => {
      if (node) this.nodes.set(id, node)
      else this.nodes.delete(id)
    }
    this.refs.set(id, ref)
    return ref
  }

  /**
   * The drop place among the items other than the dragged one: before the
   * first one whose middle is below `y`, else after the last one.
   */
  placeAt(ids: readonly string[], dragged: string, y: number): number {
    const others = ids.filter((id) => id !== dragged)
    const index = others.findIndex((id) => {
      const box = this.nodes.get(id)?.getBoundingClientRect()
      return box !== undefined && y < box.top + box.height / 2
    })
    return index < 0 ? others.length : index
  }
}

/**
 * Where the lifted item draws, in CSS px of the window: at the height of the
 * pointer, over the box of the pressed list item.
 */
export interface LiftedFrame {
  top: number
  left: number
  width: number
}

/** What a list draws while one of its items moves by drag. */
export interface ListDrag<T extends MovableItem> {
  /** The handlers of the list item of the item at `index` of the list. */
  bind: (item: T, index: number) => PointerDragProps
  /** The ref of the list item of an item, which the drag measures. */
  itemRef: (id: string) => RefCallback<HTMLElement>
  /** The item that moves, while a drag runs. */
  dragged: T | null
  /** The item before which the drop line shows, if any. */
  lineBefore: string | null
  /** The drop line shows after the last item. */
  lineAtEnd: boolean
  /** What the status of the list tells a screen reader. */
  status: string
  /** Where the lifted copy of the dragged item draws. */
  lifted: LiftedFrame | null
}

/**
 * The drag of an item in a vertical list, such as the org rail, the org
 * switcher of a phone (decision 515 C), or the chosen repositories of an
 * org (repository-order decision 1 F), on the shared pointer drag. A mouse
 * drags after a short move, and a finger lifts the item after a long
 * press, which opens no menu. The drop place is before the first other
 * item whose middle is below the pointer, else after the last item. A
 * release at the own place of the item moves nothing, also after a long
 * press that lets go without a move, so a click without a move still
 * opens an org. While an item is lifted, Escape ends only the drag, also
 * in a sheet that Escape closes.
 */
export function useListDrag<T extends MovableItem>(
  list: readonly T[],
  move: (id: string, index: number) => void,
): ListDrag<T> {
  const [items] = useState(() => new ListItems())
  const ids = list.map((item) => item.id)
  const { drag, bind, cancel } = usePointerDrag<string, number>({
    locate: (id, _x, y) => items.placeAt(ids, id, y),
    drop: ({ item, place }) => {
      const own = ids.indexOf(item)
      if (own >= 0 && place !== own) move(item, place)
    },
  })
  useEscapeLayer(drag !== null, cancel)
  // An item that left the list during its drag, such as an org after a
  // leave, shows no drag.
  const own = drag ? ids.indexOf(drag.item) : -1
  const shared = {
    bind: (item: T, index: number) => bind(item.id, index),
    itemRef: (id: string) => items.ref(id),
  }
  if (!drag || own < 0) {
    return {
      ...shared,
      dragged: null,
      lineBefore: null,
      lineAtEnd: false,
      status: '',
      lifted: null,
    }
  }
  const dragged = list[own]
  const others = ids.filter((id) => id !== dragged.id)
  // At its own place, the line marks the place of the dragged item.
  const lineBefore =
    drag.place === own ? dragged.id : (others[drag.place] ?? null)
  return {
    ...shared,
    dragged,
    lineBefore,
    lineAtEnd: lineBefore === null,
    status: `Moving ${dragged.name} to place ${drag.place + 1} of ${list.length}`,
    lifted: { top: drag.y, left: drag.box.left, width: drag.box.width },
  }
}
