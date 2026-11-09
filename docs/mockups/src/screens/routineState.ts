import type { SchemaProps } from '@mokly/mokly'
import { memberViewer, you, type PersonKey } from '../fixtures/members'
import { runListKeys } from '../fixtures/routineRuns'
import { triggerViewKeys } from '../fixtures/routineTriggers'
import { routineKeys, type Routine } from '../fixtures/routines'

/**
 * The state of the routine screen. Each catalogue entry of the screen is a
 * set of these props, and Mokly's serve controls can change each one.
 */
export const routineStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['routine', 'viewer', 'triggers', 'runs', 'focus'],
  properties: {
    /** A new routine, a draft of one, or a saved routine of Acme. */
    routine: { enum: routineKeys },
    /**
     * The person signed in: Cal, an admin of Acme, or Priya, a member who
     * is not an admin. The person who created the routine changes it.
     */
    viewer: { enum: ['admin', 'member'] },
    /**
     * The Triggers list: the saved triggers, the open Add trigger menu, the
     * editor of a schedule, a refused custom cron, or the author filter of a
     * pull request trigger, with suggestions or with a refused login.
     */
    triggers: { enum: triggerViewKeys },
    /** The runs that the Runs list shows. */
    runs: { enum: runListKeys },
    /**
     * Where a phone shows the page: at the top of the form, or at its end,
     * with the Runs list below the form. A desktop shows both.
     */
    focus: { enum: ['form', 'runs'] },
  },
} as const

export type RoutineState = SchemaProps<typeof routineStateSchema>

/** Cal's routine that reviews pull requests, as Cal sees it. */
export const ownerRoutine: RoutineState = {
  routine: 'review-prs',
  viewer: 'admin',
  triggers: 'saved',
  runs: 'review',
  focus: 'form',
}

/**
 * What the person signed in may do with a routine (decision 202): the
 * owner changes it, turns it on, and uses Run now. An admin turns it off
 * and deletes it. Every other member reads it.
 */
export type RoutineAccess = 'owner' | 'admin' | 'member'

/** The person signed in. */
function viewerOf(state: RoutineState): PersonKey {
  return state.viewer === 'admin' ? you : memberViewer
}

export function accessOf(state: RoutineState, routine: Routine): RoutineAccess {
  return routine.owner.key === viewerOf(state) ? 'owner' : state.viewer
}

/** Whether Save has changes to save, or a value that the form refuses. */
export type SaveState = 'unchanged' | 'changed' | 'refused'

export function saveStateOf(state: RoutineState, routine: Routine): SaveState {
  if (!routine.saved) return 'changed'
  switch (state.triggers) {
    case 'saved':
    case 'menu':
      return 'unchanged'
    case 'custom-refused':
      return 'refused'
    case 'hourly':
    case 'daily':
    case 'weekly':
    case 'author-filter':
    case 'suggestions':
    case 'unknown-login':
      return 'changed'
  }
}
