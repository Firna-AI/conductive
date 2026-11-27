import { ChevronDown, ChevronRight } from 'lucide-react'
import { queueLabels } from '../../../../../src/ui/components/workspace/queueCopy'
import { classes } from '../../../../../src/ui/components/common/classes'
import type { DrawnRow } from './ArchivedGroup'
import { queueCount, type GroupDrop, type MergeQueueList } from './queue'
import { QueueBlockView } from './QueueBlock'
import sectionStyles from '../../../../../src/ui/components/workspaces/SectionList.module.css'
import styles from '../../../../../src/ui/components/workspaces/MergeQueue.module.css'

type Variant = 'sidebar' | 'page'

/**
 * The Merge queue group at the top of the list. It shows while a queue has
 * entries, with one block for each queue. During a drag of a row of a
 * section, it is also a drop target (decision 317). Each row is the
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
  const body = (
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
