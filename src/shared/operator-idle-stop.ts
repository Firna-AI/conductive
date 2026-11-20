/**
 * The stop times that an operator can choose, in minutes. A cloud computer
 * of a workspace stops after this time without user activity and without a
 * running agent turn.
 */
export const IDLE_STOP_CHOICES = [15, 30, 60, 90, 120] as const

export type IdleStopMinutes = (typeof IDLE_STOP_CHOICES)[number]

/** The stop time until an operator saves another one. */
export const DEFAULT_IDLE_STOP_MINUTES: IdleStopMinutes = 30

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
