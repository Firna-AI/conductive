import type { CSSProperties } from 'react'
import { classes } from '../common/classes'
import styles from './MarkGrid.module.css'

/** The cells of the 3 × 3 grid, row by row from the top left. */
export const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

/** The outer ring of the grid, clockwise from the top left. */
export const ring: readonly number[] = [0, 1, 2, 5, 8, 7, 6, 3]

/**
 * One turn of the light around the ring, in ms. The CSS of each mark that
 * moves around the ring gives its animation the same time.
 */
const turn = 960

/**
 * The delay of a cell of the ring, so that a light runs clockwise around
 * it. Each delay is negative, so every view shows the motion already under
 * way.
 */
export function ringDelay(cell: number): CSSProperties {
  return { animationDelay: `${(ring.indexOf(cell) * turn) / 8 - turn}ms` }
}

/** How one cell of the grid looks. */
export type MarkCell = { className?: string; style?: CSSProperties }

/**
 * The grid of the marks of a workspace: 3 × 3 small square cells in a
 * 12 px box. `cell` gives the look of each cell. Screen readers skip the
 * grid, so the text beside it says the state.
 */
export function MarkGrid(props: {
  className?: string
  cell: (cell: number) => MarkCell
}) {
  return (
    <span aria-hidden className={classes(styles.grid, props.className)}>
      {cells.map((cell) => {
        const { className, style } = props.cell(cell)
        return (
          <span
            className={classes(styles.cell, className)}
            key={cell}
            style={style}
          />
        )
      })}
    </span>
  )
}
