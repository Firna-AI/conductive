import type { WorkspaceStart } from '../../src/shared/generated/WorkspaceStart'
import type { StartRecordMeta, StepPatch } from './start-record-buffer'
import type { ComputerMark } from './start-run-timer'
import type { WorkspaceStartJob } from './start-types'

/** The step IDs that the Worker sets itself. Other IDs come from the runner. */
const START_STEP_IDS = new Set([
  'image',
  'disk',
  'fetch',
  'branch',
  'startup',
  'runner',
  'start',
])

export function openStep(step: string, at: number): StepPatch {
  return { step, startedAt: at, endedAt: null, outcome: null }
}

/** A running job closes its old phase and opens its new phase at once. */
export function phasePatches(
  before: WorkspaceStartJob['phase'],
  after: WorkspaceStartJob['phase'],
  at: number,
): StepPatch[] {
  return [
    { ...openStep(`phase:${before}`, at), endedAt: at, outcome: 'done' },
    openStep(`phase:${after}`, at),
  ]
}

/** The steps of the lifecycle start, if that start belongs to the recorded job. */
export function startStepPatches(
  start: WorkspaceStart | null,
  meta: StartRecordMeta,
): StepPatch[] {
  if (!start || start.kind !== meta.jobKind || start.startedAt < meta.beganAt)
    return []
  return start.steps
    .filter((step) => START_STEP_IDS.has(step.id))
    .map((step) => ({
      step: `step:${step.id}`,
      startedAt: step.startedAt,
      endedAt: step.state === 'running' ? null : step.completedAt,
      outcome:
        step.state === 'completed'
          ? 'done'
          : step.state === 'failed'
            ? 'failed'
            : null,
    }))
}

/**
 * `computer:request` lasts from the start of a create or resume request to
 * its reply. `computer:boot` lasts from that reply to the first read that
 * shows a ready sandbox.
 */
export function computerPatches(mark: ComputerMark): StepPatch[] {
  if (mark.kind === 'request-started')
    return [openStep('computer:request', mark.at)]
  if (mark.kind === 'request-ended')
    return [
      {
        ...openStep('computer:request', mark.at),
        endedAt: mark.at,
        outcome: 'done',
      },
      openStep('computer:boot', mark.at),
    ]
  return [
    {
      ...openStep('computer:boot', mark.at),
      endedAt: mark.at,
      outcome: 'done',
      ifOpen: true,
    },
  ]
}
