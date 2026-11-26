import { ChevronDown, ChevronRight } from 'lucide-react'
import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import { instanceKey } from '../../instanceKey'
import {
  queueAddStatus,
  queueLabels,
  queueRefusedStatus,
} from '../../../../../src/ui/components/workspace/queueCopy'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { classes } from '../../../../../src/ui/components/common/classes'
import type { DrawnRow } from './ArchivedGroup'
import { queueCount, type GroupDrop, type MergeQueueList } from './queue'
import { QueueBlockView } from './QueueBlock'
import type { WorkspaceRow } from './sections'
import sectionStyles from '../../../../../src/ui/components/workspaces/SectionList.module.css'
import styles from '../../../../../src/ui/components/workspaces/MergeQueue.module.css'

type Variant = 'sidebar' | 'page'

/**
 * The group while a drag runs and no queue has entries: a zone with its
 * words. A row of a section over it, `row`, lifts over the zone, and the
 * zone takes the accent. For a row that cannot join, `reason` takes the
 * place of the words, and the zone keeps its dashed outline.
 */
function DropZone(props: {
  row?: WorkspaceRow
  reason?: string
  variant: Variant
}) {
  const { row, reason } = props
  return (
    <div
      className={classes(
        styles.zone,
        row && reason === undefined && styles.zoneOver,
        row && styles.zoneHeld,
        props.variant === 'page' && styles.pageZone,
      )}
    >
      {reason ?? queueLabels.drop}
      {row ? (
        <>
          <span aria-hidden className={styles.lift}>
            <workspaceRow.Component
              drag="lifted"
              moklyInstance={`${instanceKey(row.workspace.key)}-lifted`}
              row={row}
              variant={props.variant}
            />
          </span>
          <span className={a11y.hidden} role="status">
            {reason === undefined
              ? queueAddStatus(row.workspace.name, 1)
              : queueRefusedStatus(row.workspace.name, reason)}
          </span>
        </>
      ) : null}
    </div>
  )
}

/** The row of a section over the zone, and the reason when it cannot join. */
function zoneProps(drop: GroupDrop | undefined) {
  if (drop?.kind === 'add') return { row: drop.row }
  if (drop?.kind === 'refused') return { row: drop.row, reason: drop.reason }
  return {}
}

/**
 * The Merge queue group at the top of the list. It shows while a queue has
 * entries, with one block for each queue, and while a drag runs, as a drop
 * zone, also when no queue has entries (decision 317). Each row is the
 * normal row of a workspace, and a line joins the marks of each stack. The
 * blocks name their repositories only when two or more queues have
 * entries. The group is the app's own, not a section of the user, so it
 * has no menu. It collapses from its header, which then shows the count of
 * its entries. A queued workspace shows only here, as a flat row (decision
 * 318). `drop` is the drag that the group draws, `drawn` the one row whose
 * menu or hover the view draws, and `archivable` the rows that offer
 * Archive on hover.
 */
export function MergeQueueGroup(props: {
  queue: MergeQueueList
  variant: Variant
  drop?: GroupDrop
  drawn?: DrawnRow
  archivable?: readonly string[]
}) {
  const { queue, variant, drop } = props
  const collapsed = queue.collapsed === true
  const Chevron = collapsed ? ChevronRight : ChevronDown
  const body =
    queue.blocks.length === 0 ? (
      <DropZone variant={variant} {...zoneProps(drop)} />
    ) : (
      <div className={styles.blocks}>
        {queue.blocks.map((block) => (
          <QueueBlockView
            archivable={props.archivable}
            block={block}
            drawn={props.drawn}
            drop={drop}
            key={block.repository}
            named={queue.blocks.length > 1}
            variant={variant}
          />
        ))}
      </div>
    )
  return (
    <section aria-label={queueLabels.group} className={sectionStyles.section}>
      <div
        className={classes(
          sectionStyles.header,
          variant === 'page' && sectionStyles.pageHeader,
        )}
      >
        <h3 className={sectionStyles.heading}>
          <button
            aria-expanded={!collapsed}
            className={sectionStyles.toggle}
            type="button"
          >
            <Chevron aria-hidden className={sectionStyles.chevron} size={12} />
            <span className={sectionStyles.name}>{queueLabels.group}</span>
            {collapsed ? (
              <span className={sectionStyles.count}>{queueCount(queue)}</span>
            ) : null}
          </button>
        </h3>
      </div>
      {collapsed ? null : body}
    </section>
  )
}
