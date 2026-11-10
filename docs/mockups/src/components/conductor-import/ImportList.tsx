import { Info } from 'lucide-react'
import type { ConductorRow } from '../../fixtures/conductorImport'
import { orgs } from '../../fixtures/orgs'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { formatSize } from '../chat/sizes'
import { ActionButton } from '../common/actions'
import { CheckOption } from '../common/CheckOption'
import check from '../common/CheckOption.module.css'
import { LinkedControl } from '../common/LinkedControl'
import { ScreenLink } from '../common/ScreenLink'
import { ImportedChip, ReservationLine, RowFacts } from './ImportRows'
import styles from './ImportList.module.css'

/**
 * A row that can import: its repository is chosen, it is not imported, and
 * no unfinished upload of it waits for Try again. A row whose unfinished
 * upload expired imports again in full.
 */
export function importable(row: ConductorRow): boolean {
  return (
    row.chosen &&
    row.imported === undefined &&
    row.reservation?.kind !== 'unfinished'
  )
}

/**
 * Why a row cannot import, for a repository that the org did not choose.
 * An admin gets the way to the Repositories tab, and a member reads that an
 * admin adds it.
 */
function Unavailable(props: { row: ConductorRow; admin: boolean }) {
  const org = orgs.acme.name
  return (
    <span className={styles.unavailable}>
      <Info aria-hidden className={styles.infoIcon} size={13} />
      {props.admin
        ? `Add ${props.row.repository} to ${org} first.`
        : `An admin of ${org} can add ${props.row.repository}.`}
      {props.admin ? (
        <ScreenLink className={styles.link} to={paths.repositories}>
          Add repository
        </ScreenLink>
      ) : null}
    </span>
  )
}

/**
 * The end of a row: the chip of its workspace, Try again of its unfinished
 * upload, or the size that it uploads.
 */
function RowEnd(props: {
  row: ConductorRow
  chipTo: string | null
  retryTo: string | null
}) {
  const { row } = props
  if (row.imported) {
    return <ImportedChip to={props.chipTo} workspace={row.imported} />
  }
  if (row.reservation?.kind === 'unfinished') {
    return (
      <LinkedControl to={props.retryTo}>
        <ActionButton>Try again</ActionButton>
      </LinkedControl>
    )
  }
  return <span className={styles.size}>{formatSize(row.upload)}</span>
}

/**
 * One workspace of Conductor: its box, its name, its facts, and its end. An
 * imported row and an unfinished one have no box, because each has its
 * own action.
 */
function Row(props: {
  row: ConductorRow
  selected: boolean
  admin: boolean
  chipTo: string | null
  retryTo: string | null
}) {
  const { row } = props
  const canImport = importable(row)
  const unfinished = row.reservation?.kind === 'unfinished'
  const boxless = row.imported !== undefined || unfinished
  return (
    <li className={styles.row}>
      {boxless ? (
        <span aria-hidden className={styles.boxSpace} />
      ) : (
        <input
          aria-label={`Import ${row.name}`}
          checked={canImport && props.selected}
          className={check.box}
          disabled={!canImport}
          onChange={noop}
          type="checkbox"
        />
      )}
      <span className={styles.text}>
        <span
          className={canImport || unfinished ? styles.name : styles.mutedName}
        >
          {row.name}
        </span>
        <RowFacts row={row} />
        {row.chosen ? null : <Unavailable admin={props.admin} row={row} />}
        {row.reservation ? (
          <ReservationLine reservation={row.reservation} row={row} />
        ) : null}
      </span>
      <RowEnd chipTo={props.chipTo} retryTo={props.retryTo} row={row} />
    </li>
  )
}

/**
 * The local workspaces of Conductor that are not archived, with Select all
 * and the size of the selection. Select all shows the mixed mark while
 * only some rows are selected. A row whose repository the org did not
 * choose cannot import, and says why. A row that an earlier import brought
 * in links to its workspace, and has no box. A row whose upload stopped
 * shows how far it got and how long its parts stay, with Try again, until
 * its reservation expires. `chipTo` is the screen of the drawn imported
 * workspace, and `retryTo` the screen of Try again. Null keeps them static.
 */
export function ImportList(props: {
  rows: readonly ConductorRow[]
  selected: ReadonlySet<string>
  admin: boolean
  chipTo: string | null
  retryTo: string | null
}) {
  const choices = props.rows.filter(importable)
  const picked = choices.filter((row) => props.selected.has(row.id))
  const bytes = picked.reduce((sum, row) => sum + row.upload, 0)
  const all = choices.length > 0 && picked.length === choices.length
  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <CheckOption
          checked={all}
          label="Select all"
          mixed={picked.length > 0 && !all}
        />
        <span className={styles.summary}>
          {picked.length} of {choices.length} selected
          {picked.length > 0 ? ` · ${formatSize(bytes)}` : ''}
        </span>
      </div>
      <ul aria-label="Conductor workspaces" className={styles.list}>
        {props.rows.map((row) => (
          <Row
            admin={props.admin}
            chipTo={props.chipTo}
            key={row.id}
            retryTo={props.retryTo}
            row={row}
            selected={props.selected.has(row.id)}
          />
        ))}
      </ul>
    </div>
  )
}
