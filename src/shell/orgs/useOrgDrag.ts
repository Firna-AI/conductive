import { useState, type RefCallback } from 'react'
import { usePointerDrag, type PointerDragProps } from '../../app/pointer-drag'
import type { OrgSummary } from '../../shared/orgs'
import { useEscapeLayer } from '../ui/Overlay'

/** The list items of the orgs of one list, which a drag measures. */
class OrgItems {
  private readonly nodes = new Map<string, HTMLElement>()
  private readonly refs = new Map<string, RefCallback<HTMLElement>>()

  /** The ref of the list item of an org. It stays the same between renders. */
  ref(orgId: string): RefCallback<HTMLElement> {
    const known = this.refs.get(orgId)
    if (known) return known
    const ref: RefCallback<HTMLElement> = (node) => {
      if (node) this.nodes.set(orgId, node)
      else this.nodes.delete(orgId)
    }
    this.refs.set(orgId, ref)
    return ref
  }

  /**
   * The drop place among the orgs other than the dragged one: before the
   * first one whose middle is below `y`, else after the last one.
   */
  placeAt(orgIds: readonly string[], dragged: string, y: number): number {
    const others = orgIds.filter((orgId) => orgId !== dragged)
    const index = others.findIndex((orgId) => {
      const box = this.nodes.get(orgId)?.getBoundingClientRect()
      return box !== undefined && y < box.top + box.height / 2
    })
    return index < 0 ? others.length : index
  }
}

/**
 * Where the lifted org draws, in CSS px of the window: at the height of the
 * pointer, over the box of the pressed list item.
 */
export interface LiftedFrame {
  top: number
  left: number
  width: number
}

/** What a list of orgs draws while one of its orgs moves by drag. */
export interface OrgListDrag {
  /** The handlers of the list item of the org at `index` of the list. */
  bind: (org: OrgSummary, index: number) => PointerDragProps
  /** The ref of the list item of an org, which the drag measures. */
  itemRef: (orgId: string) => RefCallback<HTMLElement>
  /** The org that moves, while a drag runs. */
  dragged: OrgSummary | null
  /** The org before which the drop line shows, if any. */
  lineBefore: string | null
  /** The drop line shows after the last org. */
  lineAtEnd: boolean
  /** What the status of the list tells a screen reader. */
  status: string
  /** Where the lifted copy of the dragged org draws. */
  lifted: LiftedFrame | null
}

/**
 * The drag of an org in a vertical list, the rail or the org switcher of a
 * phone, on the shared pointer drag (decision 515 C). A mouse drags after a
 * short move, and a finger lifts the org after a long press, which opens no
 * menu. The drop place is before the first other org whose middle is below
 * the pointer, else after the last org. A release at the own place of the
 * org moves nothing, also after a long press that lets go without a move,
 * so a click without a move still opens the org. While an org is lifted,
 * Escape ends only the drag, also in a sheet that Escape closes.
 */
export function useOrgDrag(
  orgs: readonly OrgSummary[],
  move: (orgId: string, index: number) => void,
): OrgListDrag {
  const [items] = useState(() => new OrgItems())
  const orgIds = orgs.map((org) => org.id)
  const { drag, bind, cancel } = usePointerDrag<string, number>({
    locate: (orgId, _x, y) => items.placeAt(orgIds, orgId, y),
    drop: ({ item, place }) => {
      const own = orgIds.indexOf(item)
      if (own >= 0 && place !== own) move(item, place)
    },
  })
  useEscapeLayer(drag !== null, cancel)
  // An org that left the list during its drag, such as by a leave, shows no drag.
  const own = drag ? orgIds.indexOf(drag.item) : -1
  const shared = {
    bind: (org: OrgSummary, index: number) => bind(org.id, index),
    itemRef: (orgId: string) => items.ref(orgId),
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
  const dragged = orgs[own]
  const others = orgIds.filter((orgId) => orgId !== dragged.id)
  // At its own place, the line marks the place of the dragged org.
  const lineBefore =
    drag.place === own ? dragged.id : (others[drag.place] ?? null)
  return {
    ...shared,
    dragged,
    lineBefore,
    lineAtEnd: lineBefore === null,
    status: `Moving ${dragged.name} to place ${drag.place + 1} of ${orgs.length}`,
    lifted: { top: drag.y, left: drag.box.left, width: drag.box.width },
  }
}
