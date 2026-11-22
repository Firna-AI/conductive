import { Fragment, type ReactNode } from 'react'
import { FolderGit2 } from 'lucide-react'
import { defined } from '../../defined'
import { queueRow } from '../../entries/components/workspaces/QueueRow.mockup'
import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import { instanceKey } from '../../instanceKey'
import {
  queueAddStatus,
  queueLabels,
  queueMoveStatus,
} from '../workspace/queueCopy'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import type { DrawnRow } from './ArchivedGroup'
import {
  queueUnits,
  type GroupDrop,
  type QueueBlock,
  type QueueEntry,
} from './queue'
import sectionStyles from './SectionList.module.css'
import styles from './MergeQueue.module.css'

type Variant = 'sidebar' | 'page'

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
 * The queue of one repository, headed by its name: the units of its stack
 * in their order, from place 1, then the entries that need attention under
 * their label. A member stack keeps its rows together in an outline. A
 * drag of an entry lifts its whole unit, which stays faint in its place,
 * and the line falls only between two units. A row of a section over the
 * block joins at its end, so the block takes the outline of a drop target
 * and the line falls after its last layer. `drawn` is the one row whose
 * menu or hover the view draws.
 */
export function QueueBlockView(props: {
  block: QueueBlock
  variant: Variant
  drop?: GroupDrop
  drawn?: DrawnRow
}) {
  const { block, variant, drop, drawn } = props
  const units = queueUnits(block.entries)
  const keyOf = (entry: QueueEntry) => entry.row.workspace.key
  const reorder = drop?.kind === 'reorder' ? drop : undefined
  const lifted = units.find((unit) =>
    unit.entries.some((entry) => keyOf(entry) === reorder?.workspace),
  )
  const slots = units.filter((unit) => unit !== lifted)
  const before = lifted && reorder ? slots.at(reorder.index) : undefined
  const add =
    drop?.kind === 'add' && drop.row.workspace.repository === block.repository
      ? drop
      : undefined
  const rowOf = (entry: QueueEntry, place: number | null, faint: boolean) => (
    <queueRow.Component
      entry={entry}
      moklyInstance={instanceKey(keyOf(entry))}
      place={place}
      variant={variant}
      {...defined({
        controls:
          drawn?.workspace === keyOf(entry) ? drawn.controls : undefined,
        drag: faint ? 'placeholder' : undefined,
      })}
    />
  )
  let line: ReactNode = null
  if (lifted && reorder) {
    const first = lifted.entries[0]
    const place =
      slots
        .slice(0, reorder.index)
        .reduce((count, unit) => count + unit.entries.length, 0) + 1
    line = first ? (
      <DropLine
        lifted={
          <queueRow.Component
            carried={lifted.entries.length - 1}
            drag="lifted"
            entry={first}
            moklyInstance={`${instanceKey(keyOf(first))}-lifted`}
            place={place}
            variant={variant}
          />
        }
        status={queueMoveStatus(first.row.workspace.name, place)}
      />
    ) : null
  }
  return (
    <div className={classes(styles.block, add && styles.target)}>
      <h4 className={styles.repository}>
        <FolderGit2 aria-hidden className={styles.repositoryIcon} size={12} />
        <span className={styles.repositoryName}>{block.name}</span>
      </h4>
      <ol
        aria-label={`${queueLabels.group}, ${block.name}`}
        className={styles.rows}
      >
        {units.map((unit) => {
          const faint = unit === lifted
          const [only] = unit.entries
          return (
            <Fragment key={unit.entries.map(keyOf).join(' ')}>
              {unit === before ? line : null}
              {unit.entries.length === 1 && only ? (
                <li>{rowOf(only, unit.place, faint)}</li>
              ) : (
                <li className={classes(styles.unit, faint && styles.faint)}>
                  <ol className={styles.rows}>
                    {unit.entries.map((entry, index) => (
                      <li key={keyOf(entry)}>
                        {rowOf(entry, unit.place + index, false)}
                      </li>
                    ))}
                  </ol>
                </li>
              )}
            </Fragment>
          )
        })}
        {lifted && before === undefined ? line : null}
        {add ? (
          <DropLine
            lifted={
              <workspaceRow.Component
                drag="lifted"
                moklyInstance={`${instanceKey(add.row.workspace.key)}-lifted`}
                row={add.row}
                variant={variant}
              />
            }
            status={queueAddStatus(
              add.row.workspace.name,
              block.entries.length + 1,
            )}
          />
        ) : null}
      </ol>
      {block.attention.length > 0 ? (
        <>
          <p className={styles.attentionLabel}>{queueLabels.attention}</p>
          <ul
            aria-label={`${queueLabels.attention}, ${block.name}`}
            className={styles.rows}
          >
            {block.attention.map((entry) => (
              <li key={keyOf(entry)}>{rowOf(entry, null, false)}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
