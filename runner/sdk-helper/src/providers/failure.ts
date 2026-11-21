import type { ProviderEvent } from '../generated/ProviderEvent'

export function errorText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) {
    return (
      value
        .flatMap((item: unknown) => (typeof item === 'string' ? [item] : []))
        .join('\n')
        .trim() || null
    )
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  )
    return value.message.trim() || null
  return null
}

export function authenticationFailure(): Extract<
  ProviderEvent,
  { type: 'failed' }
> {
  return {
    type: 'failed',
    code: 'agent_authentication_failed',
    message: 'The agent login failed. Reconnect your agent account.',
  }
}

/**
 * Codex ends a usage limit message with the reset time, in the time zone of
 * the sandbox and with no zone name. The runner shares that time zone.
 */
function resetTime(message: string): string {
  const time = /try again at ([\w ,:]{1,40}?)\.?\s*$/i.exec(message)?.[1]
  if (!time) return ''
  // Node gives no IANA name for some TZ values, such as UTC+3.
  const zone: unknown = Intl.DateTimeFormat().resolvedOptions().timeZone
  const label =
    typeof zone === 'string' && zone && zone !== 'Etc/Unknown'
      ? zone
      : 'sandbox time'
  return ` Try again at ${time} ${label}.`
}

/**
 * Known causes get a short recovery action. Other causes keep their meaning.
 * Only a Codex event gives the reset time of a usage limit.
 */
export function failureCause(
  value: unknown,
  codex = false,
): Extract<ProviderEvent, { type: 'failed' }> {
  const message = errorText(value) ?? 'The agent request failed. Try again.'
  if (
    /401|unauth|authentication|invalid.?api.?key|expired.?token|invalid.?token|not logged in/i.test(
      message,
    )
  ) {
    return authenticationFailure()
  }
  if (
    /insufficient.quota|credit balance|quota exceeded|billing|usage limit/i.test(
      message,
    )
  ) {
    return {
      type: 'failed',
      code: 'agent_usage_limit',
      message: `The agent account reached its usage limit. Check your agent account.${codex ? resetTime(message) : ''}`,
    }
  }
  if (/429|rate.?limit|overloaded|capacity/i.test(message)) {
    return {
      type: 'failed',
      code: 'agent_rate_limited',
      message: 'The agent reached its rate limit. Try again later.',
    }
  }
  if (
    /unknown model|invalid.{0,10}model|model.{0,80}(not found|does not exist|unsupported|not supported|access|unavailable)/i.test(
      message,
    )
  ) {
    return {
      type: 'failed',
      code: 'agent_model_unavailable',
      message: 'The selected model is unavailable. Choose another model.',
    }
  }
  return { type: 'failed', code: 'agent_failed', message }
}
