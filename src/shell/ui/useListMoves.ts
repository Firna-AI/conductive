import { useCallback, useState, type KeyboardEvent } from 'react'
import type { MovableItem } from './useListDrag'

/** The last move of an item by one place. */
interface ItemMove {
  id: string
  /** The place of the item after the move. */
  to: number
  /** What the status of the list tells a screen reader about the move. */
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
 * The moves of an item of a vertical list to another place: by one place
 * from a menu, and from Alt and Up or Down on a focused item (decision 517
 * B), or to a place from a menu, such as Make default. The org rail and the
 * chosen repositories of an org use them. A move by keys keeps the focus on
 * the item, because React gives the focus back to a moved element. The
 * status of the list tells a screen reader the new place, such as "Acme
 * moves to place 1 of 3". It says it only while the item stays at that
 * place, so a move that did not save says nothing. `forget` drops the
 * words, such as when a drag takes over the status.
 */
export function useListMoves<T extends MovableItem>(props: {
  items: readonly T[]
  move: (id: string, index: number) => void
}) {
  const { items, move } = props
  const [last, setLast] = useState<ItemMove | null>(null)
  const forget = useCallback(() => setLast(null), [])

  /** Moves an item to the place `to`, and says so. */
  const place = (item: T, to: number) => {
    const from = items.findIndex((entry) => entry.id === item.id)
    if (from < 0 || to < 0 || to >= items.length || to === from) return
    move(item.id, to)
    const said = `${item.name} moves to place ${to + 1} of ${items.length}`
    setLast({ id: item.id, to, said })
  }
  const step = (item: T, by: -1 | 1) => {
    const from = items.findIndex((entry) => entry.id === item.id)
    if (from >= 0) place(item, from + by)
  }
  /** Moves a focused item on Alt and Up or Down, and says whether it did. */
  const onKeyDown = (item: T, event: KeyboardEvent<HTMLElement>): boolean => {
    const by = keyStep(event)
    if (by === 0) return false
    event.preventDefault()
    step(item, by)
    return true
  }
  const at = last ? items.findIndex((item) => item.id === last.id) : -1
  return {
    place,
    step,
    onKeyDown,
    status: last !== null && at === last.to ? last.said : '',
    forget,
  }
}
