import type { Agent } from '../../src/shared/generated/Agent'
import { codexTokenPaths } from './paths'
import { retryAfterSeconds } from './retry-after'

/**
 * A long upstream wait ends the Codex turn. Codex otherwise sleeps for the
 * whole `retry-after` with no error in the chat. The
 * [long waits](../../docs/protocol/model-gateway-long-waits.md) protocol
 * doc states the requirement.
 */
const CODEX_LONG_WAIT_SECONDS = 10 * 60

const modelRoutes: readonly string[] = ['/responses', codexTokenPaths.responses]
/** The last second of the year 9999. Codex shows no later reset time. */
const lastResetSecond = 253_402_300_799

/**
 * Returns the error that ends the Codex turn when a model answer is a 429
 * with a wait above the limit. Codex fails the turn on `usage_limit_reached`
 * without a retry, and its message gives the time of `resets_at`. It reads
 * only the filtered headers, so no part of a removed login can reach the
 * error.
 */
export function codexLongWait(
  agent: Agent,
  suffix: string,
  status: number,
  filteredHeaders: Headers,
  now: number,
): Response | null {
  if (agent !== 'codex' || status !== 429) return null
  if (!modelRoutes.includes(suffix)) return null
  const seconds = retryAfterSeconds(filteredHeaders.get('retry-after'), now)
  if (seconds === null || seconds <= CODEX_LONG_WAIT_SECONDS) return null
  const resetsAt = Math.ceil(now / 1000 + seconds)
  const known = resetsAt <= lastResetSecond
  const result = new Headers(filteredHeaders)
  result.delete('retry-after')
  result.delete('x-should-retry')
  result.set('content-type', 'application/json')
  return Response.json(
    {
      error: {
        type: 'usage_limit_reached',
        code: 'model_rate_limited',
        param: null,
        message: known
          ? `The model service limits this login until ${new Date(resetsAt * 1000).toISOString()}. Try again then.`
          : 'The model service limits this login. Try again later.',
        ...(known ? { resets_at: resetsAt } : {}),
      },
    },
    { status: 429, headers: result },
  )
}
