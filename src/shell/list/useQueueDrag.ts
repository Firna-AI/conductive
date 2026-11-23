import type { Workspace } from '../../shared/generated/Workspace'
import { useState } from 'react'
import { usePointerDrag, type PointerDrag } from '../../app/pointer-drag'
import { QueueLayout } from './queue-layout'

/** The entry that a drag lifts, with its queue and its unit. */
export interface QueueItem {
  workspace: Workspace
  repositoryId: string
  /** The workspace of the first entry of its unit, which names the unit. */
  unit: string
  /** The entries of its unit that move with it. */
  carried: number
}

/**
 * A drag of an entry of the Merge queue group. Its places are indexes
 * among the other units of its block.
 */
export type QueueDragState = PointerDrag<QueueItem, number | null>

/**
 * Drag and drop of the entries of the Merge queue group, on the shared
 * pointer drag: a mouse drags after a short move, and a finger lifts the
 * row after a long press. A drag lifts the whole unit of the entry, and
 * moves it only inside its block (decision 315). The drop place is before
 * the first other unit whose middle is below the pointer. Outside the
 * block, the drop has no place. A release at the unit's own place moves
 * nothing, also after a long press that lets go without a move.
 */
export function useQueueDrag(move: (item: QueueItem, index: number) => void) {
  /** The group gives its blocks and rows to the layout through refs. */
  const [layout] = useState(() => new QueueLayout())
  const { drag, bind } = usePointerDrag<QueueItem, number | null>({
    locateOnRelease: true,
    locate: (item, x, y) => layout.indexAt(item.repositoryId, item.unit, x, y),
    drop: ({ item, from, place }) => {
      if (place !== null && place !== from) move(item, place)
    },
  })
  return { drag, bind, layout }
}
