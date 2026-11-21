import type { Agent } from '../../src/shared/generated/Agent'
import { codexTokenPaths } from './paths'

/**
 * A long upstream wait ends the Codex turn. Codex otherwise sleeps for the
 * whole `retry-after` with no error in the chat. The
 * [long waits](../../docs/protocol/model-gateway-requests.md#long-waits)
 * rules state the requirement.
 */
const CODEX_LONG_WAIT_SECONDS = 10 * 60

const modelRoutes: readonly string[] = ['/responses', codexTokenPaths.responses]
/** The last second that a JavaScript date can hold. */
const lastResetSecond = 8_640_000_000_000

/** Reads delay seconds or an HTTP date, as Codex reads `retry-after`. */
function waitSeconds(value: string | null, now: number): number | null {
  const text = value?.trim() ?? ''
  if (/^\d+$/.test(text)) return Number(text)
  const date = text ? Date.parse(text) : Number.NaN
  return Number.isNaN(date) ? null : Math.max(0, (date - now) / 1000)
}

/**
 * Returns the error that ends the Codex turn when a model answer is a 429
 * with a wait above the limit. Codex fails the turn on `usage_limit_reached`
 * without a retry, and its message gives the time of `resets_at`.
 */
export function codexLongWait(
  agent: Agent,
  suffix: string,
  upstream: Response,
  headers: Headers,
  now: number,
): Response | null {
  if (agent !== 'codex' || upstream.status !== 429) return null
  if (!modelRoutes.includes(suffix)) return null
  const seconds = waitSeconds(upstream.headers.get('retry-after'), now)
  if (seconds === null || seconds <= CODEX_LONG_WAIT_SECONDS) return null
  const resetsAt = Math.min(Math.ceil(now / 1000 + seconds), lastResetSecond)
  const result = new Headers(headers)
  result.delete('retry-after')
  result.delete('x-should-retry')
  result.set('content-type', 'application/json')
  return Response.json(
    {
      error: {
        type: 'usage_limit_reached',
        code: 'model_rate_limited',
        param: null,
        message: `The model service limits this login until ${new Date(resetsAt * 1000).toISOString()}. Try again then.`,
        resets_at: resetsAt,
      },
    },
    { status: 429, headers: result },
  )
}
