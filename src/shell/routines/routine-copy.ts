import {
  eventLabels,
  scheduleLabels,
  triggersSummary,
} from '../../../docs/mockups/src/components/routines/triggerCopy'
import { activityPresentation } from '../../../docs/mockups/src/components/workspaces/status'
import type { CronProblem } from '../../app/routine-cron'
import type {
  RoutineRun,
  RoutineTrigger,
  RoutineTriggerInput,
} from '../../shared/routines'

/** What a routine does, in the words of the Routines page. */
export const routineWords =
  'A routine runs a saved prompt on a schedule or on a pull request event, each time in a new workspace.'

/** The states of a run that has no workspace, before it or in place of it. */
const runOnlyLabels = {
  queued: 'Queued',
  failed: 'Failed',
  skipped: 'Skipped',
} as const

/** A state of a run in words. A workspace state keeps its own words. */
export function runStateLabel(state: RoutineRun['state']): string {
  switch (state) {
    case 'queued':
    case 'failed':
    case 'skipped':
      return runOnlyLabels[state]
    default:
      return activityPresentation[state].label
  }
}

/**
 * The triggers of a routine in the words of the mockups, such as "Weekly on
 * Monday at 08:00, PR opened". The words name no author filter, so the
 * words of a pull request trigger read only its event.
 */
export function triggersText(triggers: readonly RoutineTrigger[]): string {
  return triggersSummary(
    triggers.map((trigger) =>
      trigger.kind === 'pull-request'
        ? { kind: trigger.kind, event: trigger.event }
        : trigger,
    ),
  )
}

/** The name of a trigger, as the Add trigger menu names it, such as "Daily". */
export function triggerName(trigger: RoutineTriggerInput): string {
  return trigger.kind === 'pull-request'
    ? eventLabels[trigger.event]
    : scheduleLabels[trigger.kind]
}

/** What the cron field says when the form refuses a cron, and how to fix it. */
export const cronRefusals: Readonly<Record<CronProblem, string>> = {
  frequent:
    'This runs more than once an hour. Set the first field to one minute, such as 0.',
  invalid: 'Use five valid fields, such as 0 9 * * 1-5.',
}
