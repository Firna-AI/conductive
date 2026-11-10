import type { CSSProperties } from 'react'
import type { ActivityStatus } from '../../fixtures/workspaces'
import { classes } from '../common/classes'
import { cells, MarkGrid, ring, ringDelay } from './MarkGrid'
import styles from './StatusGlyph.module.css'

/**
 * The cells that each state lights. Each state has its own shape, so the
 * state never depends on colour alone.
 */
const shapes: Readonly<Record<ActivityStatus, readonly number[]>> = {
  /** A light runs around the ring. */
  working: ring,
  /** The middle column pulses, like a text cursor: the agent asks. */
  input: [1, 4, 7],
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
  /** No cell lit: nothing runs, and nothing can start. */
  archived: [],
}

/** One wave of the starting row, in ms. */
const wave = 1200

/**
 * The delay of a lit cell, so the cells move in order. Each delay is
 * negative, so every view shows the motion already under way.
 */
function delay(status: ActivityStatus, cell: number): CSSProperties {
  if (status === 'working') return ringDelay(cell)
  if (status === 'starting') {
    return { animationDelay: `${(cell - 3) * 200 - wave}ms` }
  }
  return {}
}

/**
 * The state of the agent and the cloud computer of a workspace, as the
 * header shows it: a 3 × 3 dot-matrix square whose lit cells draw the
 * state. Working moves around the ring, starting fills the middle row, and
 * a workspace that needs input pulses.
 */
export function StatusGlyph(props: { status: ActivityStatus }) {
  const { status } = props
  const lit = new Set(shapes[status])
  return (
    <MarkGrid
      cell={(cell) =>
        lit.has(cell)
          ? {
              className: classes(styles.cell, styles.on),
              style: delay(status, cell),
            }
          : { className: styles.cell }
      }
      className={styles[status]}
    />
  )
}
