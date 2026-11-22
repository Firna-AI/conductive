import { ChevronDown, ChevronRight } from 'lucide-react'
import { defined } from '../../defined'
import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import { instanceKey } from '../../instanceKey'
import { queueAddStatus, queueLabels } from '../workspace/queueCopy'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import type { DrawnRow } from './ArchivedGroup'
import { queueCount, type GroupDrop, type MergeQueueList } from './queue'
import { QueueBlockView } from './QueueBlock'
import type { WorkspaceRow } from './sections'
import sectionStyles from './SectionList.module.css'
import styles from './MergeQueue.module.css'

type Variant = 'sidebar' | 'page'

/**
 * The group while a drag runs and no queue has entries: a zone with its
 * words. A row of a section over it, `row`, lifts over the zone, and the
 * zone takes the accent.
 */
function DropZone(props: { row?: WorkspaceRow; variant: Variant }) {
  const { row } = props
  return (
    <div
      className={classes(
        styles.zone,
        row && styles.zoneOver,
        props.variant === 'page' && styles.pageZone,
      )}
    >
      {queueLabels.drop}
      {row ? (
        <>
          <span aria-hidden className={styles.zoneLift}>
            <workspaceRow.Component
              drag="lifted"
              moklyInstance={`${instanceKey(row.workspace.key)}-lifted`}
              row={row}
              variant={props.variant}
            />
          </span>
          <span className={a11y.hidden} role="status">
            {queueAddStatus(row.workspace.name, 1)}
          </span>
        </>
      ) : null}
    </div>
  )
}

/**
 * The Merge queue group at the top of the list. It shows while a queue has
 * entries, with one block for each queue, headed by its repository, and
 * while a drag runs, as a drop zone, also when no queue has entries
 * (decision 317). The group is the app's own, not a section of the user,
 * so it has no menu. It collapses from its header, which then shows the
 * count of its entries. A queued workspace shows only here, as a flat row
 * (decision 318). `drop` is the drag that the group draws, and `drawn` the
 * one row whose menu or hover the view draws.
 */
export function MergeQueueGroup(props: {
  queue: MergeQueueList
  variant: Variant
  drop?: GroupDrop
  drawn?: DrawnRow
}) {
  const { queue, variant, drop } = props
  const collapsed = queue.collapsed === true
  const Chevron = collapsed ? ChevronRight : ChevronDown
  const body =
    queue.blocks.length === 0 ? (
      <DropZone
        variant={variant}
        {...defined({ row: drop?.kind === 'add' ? drop.row : undefined })}
      />
    ) : (
      <div className={styles.blocks}>
        {queue.blocks.map((block) => (
          <QueueBlockView
            block={block}
            drawn={props.drawn}
            drop={drop}
            key={block.repository}
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
