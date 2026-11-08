import { nextProviderRetry } from './provider-retry'
import type { StartJobStorage } from './start-types'

export async function retryStartError(
  storage: StartJobStorage,
  error: unknown,
  now: number,
): Promise<boolean> {
  const current = await storage.job()
  if (!current || current.cancelled || current.failure) return false
  const retry = nextProviderRetry(current.providerRetry, error, now)
  return retry === null ? false : storage.retry(current.attempt, retry)
}
