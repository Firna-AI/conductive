import { useEffect } from 'react'
import { useListDrag, type MovableItem } from './useListDrag'
import { useListMoves } from './useListMoves'

/**
 * The order of a vertical list whose items move by a drag, by a menu, and
 * by Alt and Up or Down: the org rail and the chosen repositories of an
 * org. Every move goes through one path, so each list gets the same status
 * for a screen reader: the place during a drag, and the new place after a
 * move. `sayDrop` also says the new place after a drop. The rail turns it
 * off, because its drop says nothing (decision 515 C). A drag drops the
 * words of an earlier move.
 */
export function useListOrder<T extends MovableItem>(props: {
  items: readonly T[]
  move: (id: string, index: number) => void
  sayDrop?: boolean
}) {
  const { items, move } = props
  const sayDrop = props.sayDrop ?? true
  const moves = useListMoves({ items, move })
  const drop = (id: string, index: number) => {
    const item = items.find((entry) => entry.id === id)
    if (sayDrop && item) moves.place(item, index)
    else move(id, index)
  }
  const drag = useListDrag(items, drop)
  const dragging = drag.dragged !== null
  const { forget } = moves
  useEffect(() => {
    if (dragging) forget()
  }, [dragging, forget])
  return { drag, moves, status: drag.status || moves.status }
}
