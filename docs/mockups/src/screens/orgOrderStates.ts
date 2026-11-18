import type { Viewport } from '@mokly/mokly'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import type { OrgDrag } from '../components/orgs/OrgDrop'
import { movedOrgList, orgList, type Org, type OrgKey } from '../fixtures/orgs'

/**
 * The reorder of the orgs, from decisions 515 C, 516 A, and 517 B: the
 * saved order, Firna dragged to the top, the order after that move, the
 * tile menu of Firna as the first tile, a long press that lifts Futex, or
 * a move of Acme, the open org. Acme stays open in each state.
 */
export const orgOrderStates = [
  'none',
  'drag',
  'moved',
  'menu',
  'long-press',
  'current',
] as const

export type OrgOrderState = (typeof orgOrderStates)[number]

/** What the rail, or the org switcher of a phone, draws in a state. */
export type OrgOrderView = {
  orgs: readonly Org[]
  drag?: OrgDrag
  /** The org whose tile menu is open. A phone has no tile menu. */
  menu?: OrgKey
}

/**
 * The rail of each state. `long-press` draws the start of a drag: until
 * the pointer reaches another place, the line marks the place of Futex.
 */
function railView(state: Exclude<OrgOrderState, 'none'>): OrgOrderView {
  switch (state) {
    case 'drag':
      return { orgs: orgList, drag: { org: 'firna', index: 0 } }
    case 'moved':
      return { orgs: movedOrgList }
    case 'menu':
      return { orgs: movedOrgList, menu: 'firna' }
    case 'long-press':
      return { orgs: movedOrgList, drag: { org: 'futex', index: 2 } }
    case 'current':
      return { orgs: movedOrgList, menu: 'acme' }
  }
}

/**
 * The orgs of a state, on the rail of a desktop or in the org switcher of
 * a phone. A phone has no tile menu: the menu of Firna leaves the org
 * switcher in its order, and a long press lifts Acme in place of its menu.
 * Nothing without a state of the reorder.
 */
export function orgOrderView(
  state: OrgOrderState | undefined,
  viewport: Viewport,
): OrgOrderView | undefined {
  if (state === undefined || state === 'none') return undefined
  if (viewport !== 'mobile') return railView(state)
  switch (state) {
    case 'menu':
      return { orgs: movedOrgList }
    case 'current':
      return { orgs: movedOrgList, drag: { org: 'acme', index: 0 } }
    default:
      return railView(state)
  }
}

/** The rail of a state of the reorder, with Acme open. */
export function orderRail(
  state: OrgOrderState | undefined,
): RailState | undefined {
  const view = orgOrderView(state, 'desktop')
  return view ? { ...acmeRail, ...view } : undefined
}
