import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import check from '../../../docs/mockups/src/components/common/CheckOption.module.css'
import styles from '../../../docs/mockups/src/components/conductor-import/ImportList.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { importable } from '../../app/import/import-model'
import type { ImportRow } from '../../app/import/import-uploads'
import { useServices } from '../../app/services'
import type { OrgSummary } from '../../shared/orgs'
import type { Workspace } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import {
  estimatedSize,
  ImportedChip,
  ReservationLine,
  RowFacts,
  Unavailable,
} from './ImportRowParts'

/**
 * The count and the estimated size of the selection. The size shows only
 * while each selected row has an estimate, so it never counts a row that
 * the Mac could not size as nothing.
 */
function summaryOf(picked: readonly ImportRow[], choices: number): string {
  const count = `${picked.length} of ${choices} selected`
  if (picked.length === 0) return count
  const sizes = picked.map((row) => row.uploadBytes)
  if (sizes.some((bytes) => bytes === null)) return count
  const bytes = sizes.reduce<number>((sum, size) => sum + (size ?? 0), 0)
  return `${count} · about ${formatSize(bytes)}`
}

/** The end of a row: its workspace, Try again, or its estimated size. */
function RowEnd(props: {
  row: ImportRow
  org: OrgSummary
  workspaceOf: (id: string) => Workspace | undefined
  retry: (localWorkspaceId: string) => void
  busy: boolean
}) {
  const { row } = props
  if (row.state === 'imported') {
    return (
      <ImportedChip
        name={row.name}
        orgId={props.org.id}
        workspace={props.workspaceOf(row.workspaceId)}
        workspaceId={row.workspaceId}
      />
    )
  }
  if (row.state === 'unfinished' && row.reservationId !== null) {
    return (
      <ActionButton
        disabled={props.busy}
        onPress={() => props.retry(row.localWorkspaceId)}
      >
        Try again
      </ActionButton>
    )
  }
  const size = estimatedSize(row.uploadBytes)
  return size ? <span className={styles.size}>{size}</span> : null
}

/**
 * The workspaces of Conductor on this Mac, with Select all and the count
 * and the estimated size of the selection. Select all shows the mixed mark
 * while only some rows are selected. A row whose repository the org did
 * not choose cannot import, and says why. A row that an earlier import
 * brought in links to its workspace, and a row whose upload stopped offers
 * Try again, until its parts expire. Neither has a box.
 */
export function ImportListView(props: {
  rows: readonly ImportRow[]
  selected: ReadonlySet<string>
  org: OrgSummary
  workspaceOf: (id: string) => Workspace | undefined
  toggle: (localWorkspaceId: string) => void
  selectAll: (on: boolean) => void
  retry: (localWorkspaceId: string) => void
  busy: boolean
}) {
  const { timeZone } = useServices()
  const choices = props.rows.filter(importable)
  const picked = choices.filter((row) =>
    props.selected.has(row.localWorkspaceId),
  )
  const all = choices.length > 0 && picked.length === choices.length
  const mixed = picked.length > 0 && !all
  const admin = props.org.role === 'admin'
  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <label className={check.option}>
          <input
            aria-checked={mixed ? 'mixed' : undefined}
            checked={all}
            className={classes(check.box, mixed && check.mixed)}
            disabled={choices.length === 0}
            onChange={() => props.selectAll(!all)}
            type="checkbox"
          />
          <span className={check.text}>
            <span className={check.label}>Select all</span>
          </span>
        </label>
        <span className={styles.summary}>
          {summaryOf(picked, choices.length)}
        </span>
      </div>
      <ul aria-label="Conductor workspaces" className={styles.list}>
        {props.rows.map((row) => {
          const canImport = importable(row)
          const unfinished = row.state === 'unfinished'
          const boxless = row.state === 'imported' || unfinished
          return (
            <li className={styles.row} key={row.localWorkspaceId}>
              {boxless ? (
                <span aria-hidden className={styles.boxSpace} />
              ) : (
                <input
                  aria-label={`Import ${row.name}`}
                  checked={
                    canImport && props.selected.has(row.localWorkspaceId)
                  }
                  className={check.box}
                  disabled={!canImport}
                  onChange={() => props.toggle(row.localWorkspaceId)}
                  type="checkbox"
                />
              )}
              <span className={styles.text}>
                <span
                  className={
                    canImport || unfinished ? styles.name : styles.mutedName
                  }
                >
                  {row.name}
                </span>
                <RowFacts row={row} />
                {row.state === 'unavailable' ? (
                  <Unavailable
                    admin={admin}
                    orgId={props.org.id}
                    orgName={props.org.name}
                    row={row}
                  />
                ) : null}
                {row.state === 'unfinished' ? (
                  <ReservationLine row={row} timeZone={timeZone} />
                ) : null}
              </span>
              <RowEnd
                busy={props.busy}
                org={props.org}
                retry={props.retry}
                row={row}
                workspaceOf={props.workspaceOf}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
