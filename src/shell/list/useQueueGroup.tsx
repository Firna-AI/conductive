import type { Workspace } from '../../shared/generated/Workspace'
import {
  useState,
  type ComponentProps,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react'
import { queueUnits, unitBefore, type QueueBlock } from '../../app/merge-queue'
import { isQueuePlace } from './drop-target'
import { MergeQueueGroup } from './MergeQueueGroup'
import type { QueueAdd, QueueRowOf } from './QueueBlock'
import { LiftedRow } from './RowDrop'
import { useQueueDrag } from './useQueueDrag'
import type { RowDragState } from './useRowDrag'
import { WorkspaceRow, type RowVariant } from './WorkspaceRow'

type ElementRef = (node: HTMLElement | null) => void

/** The Merge queue group of a list, and the writes of the queue. */
export interface QueueList {
  blocks: readonly QueueBlock[]
  /**
   * Why a row of a section cannot join, in the words of the drop target,
   * or null when it can join or when the list lacks a fact.
   */
  refusal: (workspace: Workspace) => string | null
  /** The viewer may re-order the queue of this entry. */
  mayMove: (workspace: Workspace) => boolean
  add: (workspace: Workspace) => void
  move: (workspaceId: string, beforeWorkspaceId: string | null) => void
}

/** The props that each row of the list shares, from the list. */
export type SharedRow = Omit<
  ComponentProps<typeof WorkspaceRow>,
  'bind' | 'drag' | 'onKeyDown' | 'rowRef' | 'depth' | 'lines' | 'carried'
>

/**
 * The Merge queue group of a list: the group at the top while a queue has
 * entries, the drag of its entries, and the rows that it shows for the
 * keys of the list. A member with write access drags an entry to another
 * place of its block, and a finger lifts it with a long press. A row of a
 * read-only list, or of a member who may not change the queue, does not
 * drag. `rowDrag` is the drag of a row of a section, which the group shows
 * as a drop target. While no queue has entries, a drag shows no group, so
 * the sections keep their places.
 */
export function useQueueGroup(props: {
  queue: QueueList | undefined
  readOnly: boolean
  variant: RowVariant
  now: number
  rowDrag: RowDragState | null
  /** The callback that gives the box of the group to the drag of a row. */
  groupNode: ElementRef
  still: (workspace: Workspace) => HTMLAttributes<HTMLElement>
  rowOf: (workspace: Workspace) => SharedRow
  queueKey: (workspace: Workspace, event: KeyboardEvent<HTMLElement>) => void
}) {
  const { queue, rowDrag } = props
  const blocks = queue?.blocks ?? []
  const [open, setOpen] = useState(true)
  const entriesOf = (repositoryId: string) =>
    blocks.find((block) => block.repositoryId === repositoryId)?.entries ?? []
  const queueDrag = useQueueDrag((item, index) => {
    const entries = entriesOf(item.repositoryId)
    queue?.move(
      item.workspace.id,
      unitBefore(entries, item.workspace.id, index),
    )
  })
  const row: QueueRowOf = (workspace, unit, faint) => {
    const units = queueUnits(entriesOf(workspace.repositoryId))
    const from = units.findIndex((item) => item[0].id === unit)
    const movable = !props.readOnly && (queue?.mayMove(workspace) ?? false)
    const item = {
      workspace,
      repositoryId: workspace.repositoryId,
      unit,
      carried: Math.max((units[from]?.length ?? 1) - 1, 0),
    }
    return (
      <WorkspaceRow
        {...props.rowOf(workspace)}
        bind={
          props.readOnly
            ? undefined
            : movable
              ? queueDrag.bind(item, from)
              : props.still(workspace)
        }
        drag={faint ? 'placeholder' : undefined}
        onKeyDown={
          movable ? (event) => props.queueKey(workspace, event) : undefined
        }
        rowRef={queueDrag.layout.row(
          workspace.id,
          workspace.repositoryId,
          unit,
        )}
      />
    )
  }
  const adding: QueueAdd | null =
    rowDrag && queue && blocks.length > 0
      ? {
          workspace: rowDrag.item,
          over: isQueuePlace(rowDrag.place),
          reason: queue.refusal(rowDrag.item),
        }
      : null
  const { drag } = queueDrag
  const group =
    queue && blocks.length > 0 ? (
      <MergeQueueGroup
        adding={adding}
        blocks={blocks}
        blockNode={(repositoryId) => queueDrag.layout.block(repositoryId)}
        groupNode={props.groupNode}
        moving={drag}
        onToggle={setOpen}
        open={open}
        row={row}
        variant={props.variant}
      />
    ) : null
  const lifted = drag ? (
    <LiftedRow
      carried={drag.item.carried}
      drag={drag}
      now={props.now}
      variant={props.variant}
      workspace={drag.item.workspace}
    />
  ) : null
  const shown = open ? blocks.flatMap((block) => block.entries) : []
  return { group, lifted, shown }
}
