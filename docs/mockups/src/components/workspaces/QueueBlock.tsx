import { Fragment, type ReactNode } from 'react'
import { FolderGit2 } from 'lucide-react'
import { defined } from '../../defined'
import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import { instanceKey } from '../../instanceKey'
import {
  queueAddStatus,
  queueLabels,
  queueMoveStatus,
  queueRefusedStatus,
} from '../../../../../src/ui/components/workspace/queueCopy'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { classes } from '../../../../../src/ui/components/common/classes'
import type { DrawnRow } from './ArchivedGroup'
import {
  queueUnits,
  type GroupDrop,
  type QueueBlock,
  type QueueEntry,
} from './queue'
import type { WorkspaceRow } from './sections'
import sectionStyles from '../../../../../src/ui/components/workspaces/SectionList.module.css'
import styles from '../../../../../src/ui/components/workspaces/MergeQueue.module.css'

type Variant = 'sidebar' | 'page'

/**
 * The copy of a row under the pointer. The first row of a member stack
 * shows the count of the rows that move with it, `carried`, in place of
 * its time.
 */
function liftedRow(row: WorkspaceRow, variant: Variant, carried = 0) {
  return (
    <workspaceRow.Component
      drag="lifted"
      moklyInstance={`${instanceKey(row.workspace.key)}-lifted`}
      row={row}
      variant={variant}
      {...defined({ carried: carried > 0 ? carried : undefined })}
    />
  )
}

/**
 * Where a drag lands in the block: a line between two units, and the
 * lifted card under the pointer. `status` is what a screen reader hears.
 */
function DropLine(props: { lifted: ReactNode; status: string }) {
  return (
    <li className={sectionStyles.drop}>
      <span aria-hidden className={sectionStyles.line}>
        <span className={sectionStyles.lineEnd} />
      </span>
      <span aria-hidden className={sectionStyles.lifted}>
        {props.lifted}
      </span>
      <span className={a11y.hidden} role="status">
        {props.status}
      </span>
    </li>
  )
}

/**
 * Why the row over the block cannot join, after the rows of the block, in
 * place of a drop line. The lifted row floats under the words.
 */
function RefusedNote(props: {
  row: WorkspaceRow
  reason: string
  variant: Variant
}) {
  const { row, reason, variant } = props
  return (
    <div
      className={classes(
        styles.reason,
        variant === 'page' && styles.pageReason,
      )}
    >
      {reason}
      <span aria-hidden className={styles.lift}>
        {liftedRow(row, variant)}
      </span>
      <span className={a11y.hidden} role="status">
        {queueRefusedStatus(row.workspace.name, reason)}
      </span>
    </div>
  )
}

/**
 * The pieces of the line that joins the marks of the stack, on the row at
 * `index` of `count` rows: up to the mark of the row above, and down to the
 * mark of the row below. A row alone has no line. A faint row keeps its
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
 * does when the org has queues in two or more repositories. A drag of an
 * entry lifts its whole unit, which stays faint in its place, and the drop
 * line falls only between two units. A row of a section over the block
 * joins at its end, so the block takes the outline of a drop target and
 * the drop line falls after its last layer. A row that cannot join gets a
 * dashed outline and the reason, and no drop line. `drawn` is the one row
 * whose menu or hover the view draws, and `archivable` the rows that offer
 * Archive on hover.
 */
export function QueueBlockView(props: {
  block: QueueBlock
  variant: Variant
  named: boolean
  drop?: GroupDrop
  drawn?: DrawnRow
  archivable?: readonly string[]
}) {
  const { block, variant, drop, drawn } = props
  const keyOf = (entry: QueueEntry) => entry.row.workspace.key
  const units = queueUnits(block.entries)
  const reorder = drop?.kind === 'reorder' ? drop : undefined
  const lifted = units.find((unit) =>
    unit.some((entry) => keyOf(entry) === reorder?.workspace),
  )
  const slots = units.filter((unit) => unit !== lifted)
  const before = reorder ? slots.at(reorder.index)?.[0] : undefined
  const over =
    (drop?.kind === 'add' || drop?.kind === 'refused') &&
    drop.row.workspace.repository === block.repository
      ? drop
      : undefined
  const rowOf = (entry: QueueEntry, faint: boolean) => (
    <workspaceRow.Component
      archivable={props.archivable?.includes(keyOf(entry)) ?? false}
      moklyInstance={instanceKey(keyOf(entry))}
      row={entry.row}
      variant={variant}
      {...defined({
        controls:
          drawn?.workspace === keyOf(entry) ? drawn.controls : undefined,
        drag: faint ? 'placeholder' : undefined,
      })}
    />
  )
  const [first] = lifted ?? []
  const line =
    lifted && reorder && first ? (
      <DropLine
        lifted={liftedRow(first.row, variant, lifted.length - 1)}
        status={queueMoveStatus(
          first.row.workspace.name,
          slots.slice(0, reorder.index).flat().length + 1,
        )}
      />
    ) : null
  const count = block.entries.length
  return (
    <div
      className={classes(
        styles.block,
        variant === 'page' && styles.pageBlock,
        over?.kind === 'add' && styles.target,
        over?.kind === 'refused' && styles.refused,
      )}
    >
      {props.named ? (
        <h4 className={styles.repository}>
          <FolderGit2 aria-hidden className={styles.repositoryIcon} size={12} />
          <span className={styles.repositoryName}>{block.name}</span>
        </h4>
      ) : null}
      <ol
        aria-label={`${queueLabels.group}, ${block.name}`}
        className={styles.rows}
      >
        {block.entries.map((entry, index) => {
          const faint = lifted?.includes(entry) ?? false
          return (
            <Fragment key={keyOf(entry)}>
              {entry === before ? line : null}
              <li className={lineClasses(index, count, faint)}>
                {rowOf(entry, faint)}
              </li>
            </Fragment>
          )
        })}
        {lifted && before === undefined ? line : null}
        {over?.kind === 'add' ? (
          <DropLine
            lifted={liftedRow(over.row, variant)}
            status={queueAddStatus(over.row.workspace.name, count + 1)}
          />
        ) : null}
      </ol>
      {over?.kind === 'refused' ? (
        <RefusedNote reason={over.reason} row={over.row} variant={variant} />
      ) : null}
    </div>
  )
}
