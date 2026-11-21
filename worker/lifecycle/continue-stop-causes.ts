import type { CommandStatus } from '../sandbox/provider'

const STOP_CAUSES = [
  'unknown',
  'cancelled',
  'provider-preparation-failed',
  'sandbox-start-failed',
  'command-start-uncertain',
  'checkout-clash',
  'index-lock',
  'comparison-metadata-failed',
] as const

export type ContinueStopCause = (typeof STOP_CAUSES)[number]

export const CONTINUE_EXIT_CODES = {
  checkoutClash: 80,
  indexLock: 81,
  comparisonMetadata: 82,
} as const

export function readContinueStopCause(value: unknown): ContinueStopCause {
  return STOP_CAUSES.find((cause) => cause === value) ?? 'unknown'
}

export function continueCommandStopCause(
  phase: 'fetch' | 'move',
  status: CommandStatus,
): ContinueStopCause {
  if (status.state !== 'exited' || status.timedOut) return 'unknown'
  if (status.exitCode === 125) return 'command-start-uncertain'
  if (phase !== 'move') return 'unknown'
  switch (status.exitCode) {
    case CONTINUE_EXIT_CODES.checkoutClash:
      return 'checkout-clash'
    case CONTINUE_EXIT_CODES.indexLock:
      return 'index-lock'
    case CONTINUE_EXIT_CODES.comparisonMetadata:
      return 'comparison-metadata-failed'
    default:
      return 'unknown'
  }
}
