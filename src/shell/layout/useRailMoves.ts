import { useCallback, useState, type KeyboardEvent } from 'react'
import type { OrgSummary } from '../../shared/orgs'

/** The last move of a tile by one place. */
interface TileMove {
  orgId: string
  /** The place of the org after the move. */
  to: number
  /** What the status of the rail tells a screen reader about the move. */
  said: string
}

/** The step of Alt and Up or Down with no other modifier key, else 0. */
function keyStep(event: KeyboardEvent<HTMLElement>): -1 | 0 | 1 {
  if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
    return 0
  }
  if (event.key === 'ArrowUp') return -1
  if (event.key === 'ArrowDown') return 1
  return 0
}

/**
 * The moves of an org tile by one place: from the tile menu, and from Alt
 * and Up or Down on a focused tile (decision 517 B). A move by keys keeps
 * the focus on the tile, because the tile keeps its link while it moves,
 * and React gives the focus back to a moved element. The status of the rail
 * tells a screen reader the new place, such as "Acme moves to place 1 of
 * 3". It says it only while the org stays at that place, so a move that
 * did not save says nothing. `forget` drops the words, such as when a drag
 * takes over the status.
 */
export function useRailMoves(props: {
  orgs: readonly OrgSummary[]
  move: (orgId: string, index: number) => void
}) {
  const { orgs, move } = props
  const [last, setLast] = useState<TileMove | null>(null)
  const forget = useCallback(() => setLast(null), [])

  const step = (org: OrgSummary, by: -1 | 1) => {
    const from = orgs.findIndex((item) => item.id === org.id)
    const to = from + by
    if (from < 0 || to < 0 || to >= orgs.length) return
    move(org.id, to)
    const said = `${org.name} moves to place ${to + 1} of ${orgs.length}`
    setLast({ orgId: org.id, to, said })
  }
  /** Moves a focused tile on Alt and Up or Down, and says whether it did. */
  const onKeyDown = (
    org: OrgSummary,
    event: KeyboardEvent<HTMLElement>,
  ): boolean => {
    const by = keyStep(event)
    if (by === 0) return false
    event.preventDefault()
    step(org, by)
    return true
  }
  const at = last ? orgs.findIndex((org) => org.id === last.orgId) : -1
  return {
    step,
    onKeyDown,
    status: last !== null && at === last.to ? last.said : '',
    forget,
  }
}
