import type { ReactNode } from 'react'
import { deletedOrgsCopy as copy } from './deletedOrgsCopy'
import { Section } from './Section'
import styles from './DeletedOrgList.module.css'

/** One deleted org: its tile, its name, its day, and what it offers. */
export type DeletedOrgRow = {
  id: string
  tile: ReactNode
  name: string
  /** When everything is deleted, or why the org offers no restore. */
  detail: string
  /** Restore, or nothing for an org that refuses a restore. */
  action?: ReactNode
  /** The failure of the last restore, under the row. */
  error?: ReactNode
}

/**
 * The Deleted orgs section of the Account page: each org that an admin
 * deleted and that the user can still restore, with its tile faded, as
 * the rail drew it before. The page of the app and its mockup share it.
 */
export function DeletedOrgList(props: { rows: readonly DeletedOrgRow[] }) {
  return (
    <Section description={copy.description} title={copy.title}>
      <ul aria-label={copy.list} className={styles.list}>
        {props.rows.map((row) => (
          <li className={styles.item} key={row.id}>
            <div className={styles.row}>
              <span aria-hidden className={styles.tile}>
                {row.tile}
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{row.name}</span>
                <span className={styles.detail}>{row.detail}</span>
              </span>
              {row.action ? (
                <span className={styles.action}>{row.action}</span>
              ) : null}
            </div>
            {row.error}
          </li>
        ))}
      </ul>
    </Section>
  )
}
