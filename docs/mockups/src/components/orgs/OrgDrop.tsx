import type { ReactNode } from 'react'
import type { OrgKey } from '../../fixtures/orgs'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import styles from './OrgDrag.module.css'

/**
 * An org in the middle of a drag, on the rail or in the org switcher of a
 * phone, from decision 515 C: the org, and the index in the list of the
 * orgs before which its line shows. The length of the list puts the line
 * after the last org, above Create org.
 */
export type OrgDrag = { org: OrgKey; index: number }

/** The place of a dragged org after its drop, counted from 1. */
export function placeAfterDrop(from: number, index: number): number {
  return index > from ? index : index + 1
}

/**
 * Where a dragged org lands: a line between two orgs, and the org lifted
 * as a raised card under the pointer or the finger. `children` is the
 * lifted copy, a tile on the rail or a row in the org switcher. `place` is
 * the place of the org after the drop, one of `count`.
 */
export function OrgDrop(props: {
  at: 'rail' | 'sheet'
  name: string
  place: number
  count: number
  children: ReactNode
}) {
  const rail = props.at === 'rail'
  return (
    <li className={rail ? styles.railDrop : styles.sheetDrop}>
      <span aria-hidden className={styles.line}>
        <span className={styles.lineEnd} />
      </span>
      <span
        aria-hidden
        className={classes(
          styles.lifted,
          rail ? styles.liftedTile : styles.liftedRow,
        )}
      >
        {props.children}
      </span>
      <span className={a11y.hidden} role="status">
        Moving {props.name} to place {props.place} of {props.count}
      </span>
    </li>
  )
}
