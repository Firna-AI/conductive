/**
 * The stop times that an operator can choose, in minutes. A cloud computer
 * of a workspace stops after this time without user activity and without a
 * running agent turn.
 */
export const IDLE_STOP_CHOICES = [15, 30, 60, 90, 120] as const

export type IdleStopMinutes = (typeof IDLE_STOP_CHOICES)[number]

/** The stop time until an operator saves another one. */
export const DEFAULT_IDLE_STOP_MINUTES: IdleStopMinutes = 30

/** The refusal of a stop time that is not a choice, which names every choice. */
export const IDLE_STOP_CHOICE_ERROR = `Choose ${IDLE_STOP_CHOICES.slice(0, -1).join(', ')}, or ${IDLE_STOP_CHOICES.at(-1)} minutes.`

/** Whether a value is one of the stop times that an operator can choose. */
export function isIdleStopMinutes(value: unknown): value is IdleStopMinutes {
  return IDLE_STOP_CHOICES.some((minutes) => minutes === value)
}

export interface OperatorIdleStopResponse {
  minutes: IdleStopMinutes
  /** The time of the last change in Unix milliseconds, or null. */
  updatedAt: number | null
  operator: { githubId: number; login: string } | null
}

export interface UpdateOperatorIdleStopRequest {
  minutes: IdleStopMinutes
}

export function operatorIdleStopPath(): string {
  return '/api/operator/idle-stop'
}
