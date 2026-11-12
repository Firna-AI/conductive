import { useEffect, type HTMLAttributes, type RefCallback } from 'react'
import type { PointerDragProps } from '../../app/pointer-drag'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgDrag } from '../orgs/useOrgDrag'
import { useOrgMove } from '../orgs/useOrgMove'
import { useRailMoves } from './useRailMoves'
import { useTileMenu } from './useTileMenu'

/** The props of the list item of an org tile: its drag, its menu, and its keys. */
export type TileProps = PointerDragProps &
  Pick<HTMLAttributes<HTMLElement>, 'onKeyDown'> & {
    ref: RefCallback<HTMLElement>
  }

/**
 * The order of the org tiles of the rail, from decision 515 C: the drag,
 * the tile menu, and Alt and Up or Down (decision 517 B). Every org tile
 * moves, also the tile of a suspended or deleted org (decision 516 A).
 * Create org, Operator, and the account take none of it. `status` is what
 * the rail tells a screen reader: the place of a drag, or the new place
 * after a move by the menu or the keys.
 */
export function useRailOrder(orgs: readonly OrgSummary[]) {
  const move = useOrgMove()
  const moves = useRailMoves({ orgs, move })
  const drag = useOrgDrag(orgs, move)
  const menu = useTileMenu({ orgs, step: moves.step })
  const dragging = drag.dragged !== null
  const { forget } = moves
  useEffect(() => {
    if (dragging) forget()
  }, [dragging, forget])

  const tile = (org: OrgSummary, index: number): TileProps => {
    const base = drag.bind(org, index)
    return {
      ...base,
      ref: drag.itemRef(org.id),
      onContextMenu: (event) => {
        base.onContextMenu?.(event)
        menu.onContextMenu(org, event)
      },
      onKeyDown: (event) => {
        if (!menu.onKeyDown(org, event)) moves.onKeyDown(org, event)
      },
    }
  }
  return {
    drag,
    tile,
    linkRef: menu.linkRef,
    menuOpen: menu.openId,
    status: drag.status || moves.status,
    menu: menu.layer,
  }
}
