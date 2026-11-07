import { ProviderError } from '../sandbox/errors'
import { isRecord } from '../http'

export const PROVIDER_RETRY_WINDOW_MS = 600_000

export interface ProviderRetryState {
  openedAt: number
  failures: number
  retryAt: number | null
}

export class ProviderRetryExhausted extends Error {
  constructor() {
    super('The provider retry window ended')
  }
}

export function providerRetryExpired(
  state: ProviderRetryState | null | undefined,
  now: number,
): boolean {
  return (
    state != null &&
    state.retryAt !== null &&
    now >= state.openedAt + PROVIDER_RETRY_WINDOW_MS
  )
}

export function transientProviderError(error: unknown): error is ProviderError {
  return (
    error instanceof ProviderError &&
    ['unavailable', 'invalid_response', 'conflict', 'rate_limited'].includes(
      error.kind,
    )
  )
}

export function nextProviderRetry(
  previous: ProviderRetryState | null | undefined,
  error: unknown,
  now: number,
): ProviderRetryState | null {
  if (!transientProviderError(error)) return null
  const openedAt = previous?.openedAt ?? now
  const remaining = openedAt + PROVIDER_RETRY_WINDOW_MS - now
  const retryAfter = (error.retryAfterSeconds ?? 0) * 1_000
  if (remaining <= 0 || !Number.isFinite(retryAfter) || retryAfter > remaining)
    return null
  const failures = (previous?.failures ?? 0) + 1
  const backoff = Math.min(60_000, 1_000 * 2 ** Math.min(failures - 1, 6))
  return {
    openedAt,
    failures,
    retryAt: now + Math.min(remaining, Math.max(backoff, retryAfter)),
  }
}

export function providerRetryPending(
  state: ProviderRetryState | null | undefined,
  now: number,
): boolean {
  return state != null && state.retryAt !== null && state.retryAt > now
}

export function readProviderRetry(value: unknown): ProviderRetryState | null {
  if (
    !isRecord(value) ||
    typeof value.openedAt !== 'number' ||
    !Number.isFinite(value.openedAt) ||
    typeof value.failures !== 'number' ||
    !Number.isSafeInteger(value.failures) ||
    value.failures < 1 ||
    (value.retryAt !== null &&
      (typeof value.retryAt !== 'number' || !Number.isFinite(value.retryAt)))
  )
    return null
  return {
    openedAt: value.openedAt,
    failures: value.failures,
    retryAt: value.retryAt,
  }
}

export function parseProviderRetry(
  text: string | null,
): ProviderRetryState | null {
  try {
    return text === null ? null : readProviderRetry(JSON.parse(text))
  } catch {
    return null
  }
}
