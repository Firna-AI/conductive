import type { Workspace } from '../../shared/generated/Workspace'
import { Fragment, type ReactNode } from 'react'
import { FolderGit2 } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import {
  queueAddStatus,
  queueLabels,
  queueMoveStatus,
  queueRefusedStatus,
} from '../../ui/components/workspace/queueCopy'
import styles from '../../ui/components/workspaces/MergeQueue.module.css'
import sectionStyles from '../../ui/components/workspaces/SectionList.module.css'
import { queueUnits, type QueueBlock } from '../../app/merge-queue'
import { nameLabel } from '../../shared/name-label'
import ui from '../ui/ui.module.css'
import type { RowVariant } from './WorkspaceRow'

type ElementRef = (node: HTMLElement | null) => void

/**
 * A row of a section that a drag lifts, as the Merge queue group draws it.
 * `reason` says why it cannot join, or null when it can join, or when the
 * list lacks a fact and the Worker decides.
 */
export interface QueueAdd {
  workspace: Workspace
  /** The pointer is over the group. */
  over: boolean
  reason: string | null
}

/** The row of an entry, by the list. `faint`: its unit is lifted. */
export type QueueRowOf = (
  workspace: Workspace,
  unit: string,
  faint: boolean,
) => ReactNode

/**
 * Where a drag lands in the block: a line between two units, or after the
 * last entry. `status` is what a screen reader hears.
 */
function PlaceLine(props: { status: string }) {
  return (
    <li className={sectionStyles.drop}>
      <span aria-hidden className={sectionStyles.line}>
        <span className={sectionStyles.lineEnd} />
      </span>
      <span className={ui.hidden} role="status">
        {props.status}
      </span>
    </li>
  )
}

/**
 * The pieces of the line that joins the marks of the stack, on the row at
 * `index` of `count` rows. A row alone has no line. A faint row keeps its
 * pieces, faint too.
 */
function lineClasses(index: number, count: number, faint: boolean) {
  if (count < 2) return undefined
  return classes(
    index > 0 && styles.above,
    index < count - 1 && styles.below,
    faint && styles.faintLine,
  )
}

/**
 * The queue of one repository: the normal rows of its stack in their
 * order, from place 1, with a line that joins their list marks. An entry
 * that cannot merge keeps its place on the line, with the mark of its
 * GitHub state. `named` heads the block with its repository, as the group
 * does when two or more queues have entries. A drag of an entry, `moving`,
 * leaves its whole unit faint in its place, and the drop line falls only
 * between two units. A row of a section over the block, `adding`, joins at
 * its end: the block takes the outline of a drop target, and the drop line
 * falls after its last entry. A row that cannot join gets a dashed outline
 * and the reason, and no drop line.
 */
export function QueueBlockView({
  measure,
  ...props
}: {
  block: QueueBlock
  variant: RowVariant
  named: boolean
  adding: QueueAdd | null
  moving: { unit: string; index: number | null } | null
  row: QueueRowOf
  /** The box of the block, which a drag of an entry measures. */
  measure: ElementRef
}) {
  const { block, adding, moving } = props
  const page = props.variant === 'page'
  const units = queueUnits(block.entries)
  const lifted = moving
    ? units.find((unit) => unit[0].id === moving.unit)
    : undefined
  const slots = units.filter((unit) => unit !== lifted)
  const index = moving?.index ?? null
  const before = index !== null && lifted ? slots[index]?.[0] : undefined
  const line =
    index !== null && lifted ? (
      <PlaceLine
        status={queueMoveStatus(
          nameLabel(lifted[0].name),
          slots.slice(0, index).flat().length + 1,
        )}
      />
    ) : null
  const count = block.entries.length
  const refused = adding?.reason ?? null
  const label = block.name
    ? `${queueLabels.group}, ${block.name}`
    : queueLabels.group
  const unitOf = new Map(
    units.flatMap((unit) => unit.map((entry) => [entry.id, unit] as const)),
  )
  return (
    <div
      className={classes(
        styles.block,
        page && styles.pageBlock,
        adding !== null && refused === null && styles.target,
        refused !== null && styles.refused,
      )}
      ref={measure}
    >
      {props.named && block.name ? (
        <h4 className={styles.repository}>
          <FolderGit2 aria-hidden className={styles.repositoryIcon} size={12} />
          <span className={styles.repositoryName}>{block.name}</span>
        </h4>
      ) : null}
      <ol aria-label={label} className={styles.rows}>
        {block.entries.map((entry, at) => {
          const unit = unitOf.get(entry.id) ?? [entry]
          const faint = unit === lifted
          return (
            <Fragment key={entry.id}>
              {entry === before ? line : null}
              <li className={lineClasses(at, count, faint)}>
                {props.row(entry, unit[0].id, faint)}
              </li>
            </Fragment>
          )
        })}
        {lifted && before === undefined ? line : null}
        {adding && refused === null ? (
          <PlaceLine
            status={queueAddStatus(nameLabel(adding.workspace.name), count + 1)}
          />
        ) : null}
      </ol>
      {adding && refused !== null ? (
        <div className={classes(styles.reason, page && styles.pageReason)}>
          {refused}
          <span className={ui.hidden} role="status">
            {queueRefusedStatus(nameLabel(adding.workspace.name), refused)}
          </span>
        </div>
      ) : null}
    </div>
  )
}
