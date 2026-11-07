import { isRecord } from '../http'

export type GitHubTokenBundle = {
  accessToken: string
} & (
  | { expiresAt: null; refreshToken: null; refreshExpiresAt: null }
  | { expiresAt: number; refreshToken: string; refreshExpiresAt: number }
)

function isToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !/\s/.test(value)
}

function expiration(seconds: unknown, now: number): number | null {
  if (
    typeof seconds !== 'number' ||
    !Number.isSafeInteger(seconds) ||
    seconds <= 0
  ) {
    return null
  }
  const result = now + seconds * 1000
  return Number.isSafeInteger(result) && result > now ? result : null
}

export function parseGitHubTokens(
  value: unknown,
  now: number,
): GitHubTokenBundle | null {
  if (
    !isRecord(value) ||
    !isToken(value.access_token) ||
    (value.token_type !== undefined && value.token_type !== 'bearer') ||
    value.error !== undefined
  ) {
    return null
  }
  if (
    value.expires_in === undefined &&
    value.refresh_token === undefined &&
    value.refresh_token_expires_in === undefined
  ) {
    return {
      accessToken: value.access_token,
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    }
  }
  const expiresAt = expiration(value.expires_in, now)
  const refreshExpiresAt = expiration(value.refresh_token_expires_in, now)
  if (!expiresAt || !refreshExpiresAt || !isToken(value.refresh_token)) {
    return null
  }
  return {
    accessToken: value.access_token,
    expiresAt,
    refreshToken: value.refresh_token,
    refreshExpiresAt,
  }
}

export function parseStoredGitHubTokens(
  value: unknown,
): GitHubTokenBundle | null {
  if (!isRecord(value) || !isToken(value.accessToken)) return null
  if (
    value.expiresAt === null &&
    value.refreshToken === null &&
    value.refreshExpiresAt === null
  ) {
    return {
      accessToken: value.accessToken,
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    }
  }
  if (
    typeof value.expiresAt !== 'number' ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt <= 0 ||
    !isToken(value.refreshToken) ||
    typeof value.refreshExpiresAt !== 'number' ||
    !Number.isSafeInteger(value.refreshExpiresAt) ||
    value.refreshExpiresAt <= 0
  ) {
    return null
  }
  return {
    accessToken: value.accessToken,
    expiresAt: value.expiresAt,
    refreshToken: value.refreshToken,
    refreshExpiresAt: value.refreshExpiresAt,
  }
}
