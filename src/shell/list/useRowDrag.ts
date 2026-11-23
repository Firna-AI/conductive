import type { Workspace } from '../../shared/generated/Workspace'
import { useState, type HTMLAttributes } from 'react'
import { useLongPress } from '../../app/long-press'
import { usePointerDrag, type PointerDrag } from '../../app/pointer-drag'

import {
  DropLayout,
  intoQueue,
  isQueuePlace,
  type DropTarget,
  type RowPlace,
} from './drop-target'

/**
 * A drag of a workspace row. Its item is the workspace, and its places are
 * places in a section, or the Merge queue group.
 */
export type RowDragState = PointerDrag<Workspace, RowPlace>

function samePlace(a: RowPlace, b: RowPlace): boolean {
  if (isQueuePlace(a) || isQueuePlace(b)) return a === b
  return a.sectionId === b.sectionId && a.index === b.index
}

/** A long press of a nested row, which does nothing. */
function holdNothing(): void {}

/**
 * Drag and drop of workspace rows between sections, on the shared pointer
 * drag: a mouse drags after a short move, and a finger lifts the row after a
 * long press. Only a top-level row drags, and its tree moves with it. The
 * drop place is in the section under the pointer, before the first other
 * tree whose middle is below it. Over the Merge queue group, a drop calls
 * `add`, which adds the workspace when it can join (decision 317). Outside
 * every section and the group, the row returns to its own place. A release at the
 * row's own place moves nothing, also after a long press that lets go
 * without a move.
 *
 * `still` gives the handlers of a nested row, which nothing lifts: a long
 * press of a finger does nothing, so it opens no menu and the click after
 * it opens nothing, and no press starts a native drag of its link.
 */
export function useRowDrag(
  move: (workspaceId: string, target: DropTarget) => void,
  add: (workspace: Workspace) => void = () => {},
) {
  /** The list gives its sections and rows to the layout through refs. */
  const [layout] = useState(() => new DropLayout())
  const { drag, bind } = usePointerDrag<Workspace, RowPlace>({
    locateOnRelease: true,
    locate: (workspace, x, y, last, from) => {
      const hit = document.elementFromPoint(x, y)
      const target = layout.inGroup(hit)
        ? intoQueue
        : (layout.targetAt(workspace.id, hit, y) ?? from)
      // After a scroll, the hook draws again only for a new place object.
      return samePlace(target, last) ? last : target
    },
    drop: ({ item, from, place }) => {
      if (isQueuePlace(place)) add(item)
      else if (!samePlace(place, from)) move(item.id, place)
    },
  })
  const hold = useLongPress<Workspace>(holdNothing)
  const still = (workspace: Workspace): HTMLAttributes<HTMLElement> => ({
    ...hold(workspace),
    onDragStart: (event) => event.preventDefault(),
  })
  return { drag, bind, still, layout }
}
