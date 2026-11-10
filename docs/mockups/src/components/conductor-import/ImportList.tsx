import { Info } from 'lucide-react'
import type { ConductorRow } from '../../fixtures/conductorImport'
import { orgs } from '../../fixtures/orgs'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { formatSize } from '../chat/sizes'
import { CheckOption } from '../common/CheckOption'
import check from '../common/CheckOption.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { ImportedChip, RowFacts } from './ImportRows'
import styles from './ImportList.module.css'

/** A row that can import: its repository is chosen, and it is not imported. */
export function importable(row: ConductorRow): boolean {
  return row.chosen && row.imported === undefined
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

/** One workspace of Conductor: its box, its name, its facts, and its size. */
function Row(props: {
  row: ConductorRow
  selected: boolean
  admin: boolean
  chipTo: string | null
}) {
  const { row } = props
  const canImport = importable(row)
  return (
    <li className={styles.row}>
      {row.imported ? (
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
        <span className={canImport ? styles.name : styles.mutedName}>
          {row.name}
        </span>
        <RowFacts row={row} />
        {row.chosen ? null : <Unavailable admin={props.admin} row={row} />}
      </span>
      {row.imported ? (
        <ImportedChip to={props.chipTo} workspace={row.imported} />
      ) : (
        <span className={styles.size}>{formatSize(row.upload)}</span>
      )}
    </li>
  )
}

/**
 * The local workspaces of Conductor that are not archived, with Select all
 * and the size of the selection. Select all shows the mixed mark while
 * only some rows are selected. A row whose repository the org did not
 * choose cannot import, and says why. A row that an earlier import brought
 * in links to its workspace, and has no box. `chipTo` is the screen of the
 * drawn imported workspace, and null keeps every chip static.
 */
export function ImportList(props: {
  rows: readonly ConductorRow[]
  selected: ReadonlySet<string>
  admin: boolean
  chipTo: string | null
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
            row={row}
            selected={props.selected.has(row.id)}
          />
        ))}
      </ul>
    </div>
  )
}
