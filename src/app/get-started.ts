import type { GetStartedResponse, GetStartedStep } from '../shared/onboarding'

export type StepState = 'done' | 'next' | 'later'

/**
 * The three steps of Get started in their fixed order: the GitHub App, the
 * first org, then Claude or Codex. A reply of the API names only these.
 */
export const getStartedOrder: readonly GetStartedStep[] = [
  'github-app',
  'org',
  'agent-login',
]

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
