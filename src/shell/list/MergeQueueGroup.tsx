import { ChevronDown, ChevronRight } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import {
  queueAddStatus,
  queueLabels,
  queueRefusedStatus,
} from '../../ui/components/workspace/queueCopy'
import styles from '../../ui/components/workspaces/MergeQueue.module.css'
import sectionStyles from '../../ui/components/workspaces/SectionList.module.css'
import type { QueueBlock } from '../../app/merge-queue'
import { nameLabel } from '../../shared/name-label'
import ui from '../ui/ui.module.css'
import { QueueBlockView, type QueueAdd, type QueueRowOf } from './QueueBlock'
import type { QueueDragState } from './useQueueDrag'
import type { RowVariant } from './WorkspaceRow'

type ElementRef = (node: HTMLElement | null) => void

/**
 * The group as a drop zone, while a drag of a row of a section runs and no
 * block takes the row: the queue of its repository has no entries, or the
 * group is collapsed. The zone takes the accent while the
 * row is over the group. For a row that cannot join, the reason takes the
 * place of the words, and the zone keeps its dashed outline.
 */
function DropZone(props: { adding: QueueAdd; variant: RowVariant }) {
  const { adding } = props
  const reason = adding.over ? adding.reason : null
  const name = nameLabel(adding.workspace.name)
  return (
    <div
      className={classes(
        styles.zone,
        adding.over && reason === null && styles.zoneOver,
        props.variant === 'page' && styles.pageZone,
      )}
    >
      {reason ?? queueLabels.drop}
      {adding.over ? (
        <span className={ui.hidden} role="status">
          {reason === null
            ? queueAddStatus(name, 1)
            : queueRefusedStatus(name, reason)}
        </span>
      ) : null}
    </div>
  )
}

/**
 * The Merge queue group at the top of the list. It shows while a queue has
 * entries, with one block for each queue in the order of the repositories.
 * During a drag of a row of a section, the group is also a drop target
 * (decision 317). While no queue has entries, a drag shows no group, so the
 * sections do not move down. Each row is the normal row of its
 * workspace, and a line joins the marks of each stack. The blocks name
 * their repositories only when two or more queues have entries. The group
 * is the app's own, not a section of the org, so it has no menu. It
 * collapses from its header, which then shows the count of its entries,
 * for the member only. A queued workspace shows only here (decision 318).
 * `adding` is the row of a section that a drag lifts, and `moving` the
 * drag of an entry.
 */
export function MergeQueueGroup({
  groupNode,
  blockNode,
  ...props
}: {
  blocks: readonly QueueBlock[]
  variant: RowVariant
  open: boolean
  onToggle: (open: boolean) => void
  adding: QueueAdd | null
  moving: QueueDragState | null
  row: QueueRowOf
  /** Gives the box of the group to the drag of a row of a section. */
  groupNode: ElementRef
  /** Gives the box of each block to the drag of an entry. */
  blockNode: (repositoryId: string) => ElementRef
}) {
  const { blocks, open, adding, moving } = props
  const Chevron = open ? ChevronDown : ChevronRight
  const count = blocks.reduce((sum, block) => sum + block.entries.length, 0)
  const target = adding
    ? blocks.find(
        (block) => block.repositoryId === adding.workspace.repositoryId,
      )
    : undefined
  // A row of a section that no shown block takes waits for the zone.
  const zone =
    adding && (!open || target === undefined) ? (
      <DropZone adding={adding} variant={props.variant} />
    ) : null
  return (
    <section
      aria-label={queueLabels.group}
      className={sectionStyles.section}
      ref={groupNode}
    >
      <div
        className={classes(
          sectionStyles.header,
          props.variant === 'page' && sectionStyles.pageHeader,
        )}
      >
        <h3 className={sectionStyles.heading}>
          <button
            aria-expanded={open}
            className={sectionStyles.toggle}
            onClick={() => props.onToggle(!open)}
            type="button"
          >
            <Chevron aria-hidden className={sectionStyles.chevron} size={12} />
            <span className={sectionStyles.name}>{queueLabels.group}</span>
            {open ? null : <span className={sectionStyles.count}>{count}</span>}
          </button>
        </h3>
      </div>
      {open && blocks.length > 0 ? (
        <div className={styles.blocks}>
          {blocks.map((block) => (
            <QueueBlockView
              adding={adding?.over && block === target ? adding : null}
              block={block}
              measure={blockNode(block.repositoryId)}
              key={block.repositoryId}
              moving={
                moving?.item.repositoryId === block.repositoryId
                  ? { unit: moving.item.unit, index: moving.place }
                  : null
              }
              named={blocks.length > 1}
              row={props.row}
              variant={props.variant}
            />
          ))}
          {zone}
        </div>
      ) : (
        zone
      )}
    </section>
  )
}
