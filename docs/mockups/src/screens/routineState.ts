import type { SchemaProps } from '@mokly/mokly'
import { memberViewer, you, type PersonKey } from '../fixtures/members'
import { runListKeys } from '../fixtures/runLists'
import { triggerViewKeys } from '../fixtures/routineTriggers'
import { routineKeys, type Routine } from '../fixtures/routines'

/**
 * The state of the routine screen. Each catalogue entry of the screen is a
 * set of these props, and Mokly's serve controls can change each one.
 */
export const routineStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['routine', 'viewer', 'triggers', 'runs', 'tab', 'org'],
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
     * The tab that a phone shows: the form of the routine, or its runs. A
     * desktop shows both, with the runs in a column at the right. A new
     * routine has no tabs, because it has no runs yet.
     */
    tab: { enum: ['routine', 'runs'] },
    /**
     * The org: in use, or suspended by the operator. A suspended org keeps
     * every read, so each member reads its routines and runs, and nobody
     * changes them, also an admin or the owner.
     */
    org: { enum: ['active', 'suspended'] },
  },
} as const

export type RoutineState = SchemaProps<typeof routineStateSchema>

/** Cal's routine that reviews pull requests, as Cal sees it. */
export const ownerRoutine: RoutineState = {
  routine: 'review-prs',
  viewer: 'admin',
  triggers: 'saved',
  runs: 'review',
  tab: 'routine',
  org: 'active',
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
  // A suspended org refuses every change, so every person only reads.
  if (state.org === 'suspended') return 'member'
  return routine.owner.key === viewerOf(state) ? 'owner' : state.viewer
}

/**
 * Whether Save has changes to save, or a value that the form refuses: a
 * prompt without text (decision 211 B), or a cron that runs more than once
 * an hour.
 */
export type SaveState = 'unchanged' | 'changed' | 'refused'

export function saveStateOf(state: RoutineState, routine: Routine): SaveState {
  if (routine.prompt.trim() === '') return 'refused'
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
