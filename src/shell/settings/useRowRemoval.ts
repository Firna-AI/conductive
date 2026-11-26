import { useRef, useState, type RefCallback } from 'react'
import {
  removedPlaceOf,
  repositoryRemoval,
  type RemovedPlace,
} from '../../ui/components/settings/repositoryRemovalCopy'
import type { Repository } from '../../shared/org-settings'

/** A row of the repository order: its ID, its spoken name, and its record. */
interface OrderRow {
  id: string
  name: string
  repository: Repository
}

/** The question before Remove, open for one row of the order. */
export interface AskedRemoval {
  repository: Repository
  /** Where the row stood when the question opened. */
  place: RemovedPlace
  /** The row that takes the focus after the removal, or null for none. */
  next: string | null
}

/**
 * Remove of the row menu of the repository order: the question that it
 * opens for one row, the focus after the removal, and the words of the
 * status. The question keeps the place of the row from its opening, so its
 * words do not change while it shows. After a removal, as the question
 * closes, the focus goes to the row that took the place of the removed
 * row, else to the row before it, as the question saw them, else to Edit
 * through `focusEdit`. The status then says that the repository is
 * removed, until a move or a drag gives `status` words of its own. A
 * question that closes without a removal gives the focus back to the row
 * menu.
 */
export function useRowRemoval(props: {
  rows: readonly OrderRow[]
  /** The words of the moves and the drags of the order. */
  status: string
  /** Drops the words of the last move. */
  forgetMoves: () => void
  focusEdit: () => void
}) {
  const { rows, forgetMoves, focusEdit } = props
  const [asked, setAsked] = useState<AskedRemoval | null>(null)
  const [said, setSaid] = useState('')
  // New words of a move or a drag end the words of a removal.
  const [heard, setHeard] = useState(props.status)
  if (props.status !== heard) {
    setHeard(props.status)
    if (props.status !== '') setSaid('')
  }
  // The removal that saved, which the closing question reads.
  const removed = useRef<AskedRemoval | null>(null)
  const [menus] = useState(() => new Map<string, HTMLElement>())
  return {
    asked,
    /** Opens the question for the row at `place`. */
    ask: (row: OrderRow, place: number) => {
      setAsked({
        repository: row.repository,
        place: removedPlaceOf(
          rows.map((item) => item.name),
          place,
        ),
        next: rows[place + 1]?.id ?? rows[place - 1]?.id ?? null,
      })
    },
    /** The ref of the row menu button of the row `id`. */
    menuRef:
      (id: string): RefCallback<unknown> =>
      (element) => {
        if (element instanceof HTMLElement) menus.set(id, element)
        else menus.delete(id)
      },
    close: () => setAsked(null),
    /** The removal saved: the question closes. */
    done: () => {
      removed.current = asked
      setAsked(null)
    },
    /**
     * Places the focus as the question closes. The page is active again
     * by then, so the focus and the words of the status reach a screen
     * reader.
     */
    returnFocus: () => {
      const removal = removed.current
      removed.current = null
      if (!removal) return
      const next = removal.next === null ? undefined : menus.get(removal.next)
      const kept = rows.map((row) => menus.get(row.id)).find(Boolean)
      const target = next ?? kept
      if (target) target.focus()
      else focusEdit()
      forgetMoves()
      setSaid(repositoryRemoval.removed(removal.repository.fullName))
    },
    status: props.status === '' ? said : props.status,
  }
}
