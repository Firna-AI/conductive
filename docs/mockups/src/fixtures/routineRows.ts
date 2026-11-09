/**
 * The routines of Acme as its Routines page lists them, with the state of
 * the last run of each.
 */

import { stateAfterSuspension, type RunState } from './routineRuns'
import { changelog, errorTriage, routines, type Routine } from './routines'

/** A routine in the list of the org, with the state of its last run. */
export type RoutineRow = {
  routine: Routine
  lastRun?: { state: RunState; when: string }
}

/** The routines of Acme, as its Routines page lists them. */
export const routineRows: readonly RoutineRow[] = [
  {
    routine: routines['review-prs'],
    lastRun: { state: 'working', when: 'now' },
  },
  { routine: errorTriage, lastRun: { state: 'unread', when: '32m' } },
  {
    routine: routines['dependency-updates'],
    lastRun: { state: 'ready', when: '3d' },
  },
  { routine: changelog, lastRun: { state: 'archived', when: '6d' } },
  {
    routine: routines['copy-review'],
    lastRun: { state: 'stopped', when: '2w' },
  },
]

/**
 * The same routines after the operator suspended Acme a minute ago. The
 * suspension stopped the workspace of each last run.
 */
export const suspendedRoutineRows: readonly RoutineRow[] = routineRows.map(
  (row) => {
    if (!row.lastRun) return row
    const { state, when } = row.lastRun
    return {
      ...row,
      lastRun: {
        state: stateAfterSuspension(state),
        when: when === 'now' ? '1m' : when,
      },
    }
  },
)
