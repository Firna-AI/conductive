import type { CSSProperties } from 'react'
import type { ActivityStatus } from '../../fixtures/workspaces'
import { classes } from '../common/classes'
import styles from './StatusGlyph.module.css'

/** The cells of the 3 × 3 grid, row by row from the top left. */
const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

/** The outer ring of the grid, clockwise from the top left. */
const ring = [0, 1, 2, 5, 8, 7, 6, 3]

/**
 * The cells that each state lights. Each state has its own shape, so the
 * state never depends on colour alone.
 */
const shapes: Readonly<Record<ActivityStatus, readonly number[]>> = {
  /** A light runs around the ring. */
  working: ring,
  /** The full grid: a turn finished with output to read. */
  unread: cells,
  /** One cell in the centre, like a standby light. */
  ready: [4],
  /** The middle row fills from left to right. */
  starting: [3, 4, 5],
  /** Two columns, like a pause sign. */
  stopped: [0, 3, 6, 2, 5, 8],
  /** A cross. */
  error: [0, 2, 4, 6, 8],
}

/** One turn of the working ring, and one wave of the starting row, in ms. */
const turn = 960
const wave = 1200

/**
 * The delay of a lit cell, so the cells move in order. Each delay is
 * negative, so every view shows the motion already under way.
 */
function delay(status: ActivityStatus, cell: number): CSSProperties {
  if (status === 'working') {
    return { animationDelay: `${(ring.indexOf(cell) * turn) / 8 - turn}ms` }
  }
  if (status === 'starting') {
    return { animationDelay: `${(cell - 3) * 200 - wave}ms` }
  }
  return {}
}

/**
 * The state of a workspace as a small dot-matrix square: a 3 × 3 grid whose
 * lit cells draw the state. Working moves around the ring, and starting
 * fills the middle row.
 */
export function StatusGlyph(props: { status: ActivityStatus }) {
  const lit = new Set(shapes[props.status])
  return (
    <span aria-hidden className={classes(styles.glyph, styles[props.status])}>
      {cells.map((cell) =>
        lit.has(cell) ? (
          <span
            className={`${styles.cell} ${styles.on}`}
            key={cell}
            style={delay(props.status, cell)}
          />
        ) : (
          <span className={styles.cell} key={cell} />
        ),
      )}
    </span>
  )
}
