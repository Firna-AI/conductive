import type { GetStartedResponse, GetStartedStep } from '../shared/onboarding'
import { GET_STARTED_STEPS } from './api/read-core'

export type StepState = 'done' | 'next' | 'later'

/**
 * The four steps of Get started in their fixed order (decision 33): the
 * GitHub App, the first org, its Boat key, then Claude or Codex. The key
 * belongs to the org, so the org comes first.
 */
export const getStartedOrder: readonly GetStartedStep[] = GET_STARTED_STEPS

function complete(response: GetStartedResponse, step: GetStartedStep) {
  return response.steps.some((item) => item.step === step && item.complete)
}

/** The first step that is not done, or `done` after the last one. */
export function nextStep(
  response: GetStartedResponse,
): GetStartedStep | 'done' {
  return getStartedOrder.find((step) => !complete(response, step)) ?? 'done'
}

/** A step shows as done, as the next step with its form, or as a later one. */
export function stepState(
  response: GetStartedResponse,
  step: GetStartedStep,
): StepState {
  if (complete(response, step)) return 'done'
  return nextStep(response) === step ? 'next' : 'later'
}

/** Get started is the only first run. It shows until every step is done. */
export function inFirstRun(response: GetStartedResponse | null): boolean {
  return response !== null && nextStep(response) !== 'done'
}
