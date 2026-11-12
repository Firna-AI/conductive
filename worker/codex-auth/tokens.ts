import { isRecord } from '../http'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'

export const CODEX_RECONNECT_CAUSE = chatGptSignInCopy.causes.notRenewed

export interface CodexTokens {
  accessToken: string
  refreshToken: string
  idToken: string
  accountId: string
  expiresAt: number
}

interface CodexIdentity {
  accountId: string
  email: string | null
  planType: string | null
  userId: string | null
}

function token(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !/\s/.test(value)
}

function jwtClaims(value: string): Record<string, unknown> | null {
  try {
    const parts = value.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return isRecord(claims) ? claims : null
  } catch {
    return null
  }
}

export function parseCodexIdentity(idToken: string): CodexIdentity | null {
  const claims = jwtClaims(idToken)
  const auth = claims?.['https://api.openai.com/auth']
  if (!isRecord(auth) || !token(auth.chatgpt_account_id)) return null
  const userId = auth.chatgpt_user_id ?? auth.user_id
  const profile = claims?.['https://api.openai.com/profile']
  const email = claims?.email ?? (isRecord(profile) ? profile.email : null)
  return {
    accountId: auth.chatgpt_account_id,
    email: typeof email === 'string' ? email : null,
    planType:
      typeof auth.chatgpt_plan_type === 'string'
        ? auth.chatgpt_plan_type
        : null,
    userId: typeof userId === 'string' ? userId : null,
  }
}

export function parseOAuthCodexTokens(
  value: unknown,
  now: number,
): CodexTokens | null {
  if (
    !isRecord(value) ||
    !token(value.access_token) ||
    !token(value.refresh_token) ||
    !token(value.id_token)
  )
    return null
  const identity = parseCodexIdentity(value.id_token)
  const exp = jwtClaims(value.access_token)?.exp
  const expiresAt =
    typeof exp === 'number' && Number.isSafeInteger(exp * 1000)
      ? exp * 1000
      : typeof value.expires_in === 'number' &&
          value.expires_in > 0 &&
          Number.isSafeInteger(value.expires_in)
        ? now + value.expires_in * 1000
        : 0
  if (!identity || !Number.isSafeInteger(expiresAt) || expiresAt <= now)
    return null
  return {
    accessToken: value.access_token,
    refreshToken: value.refresh_token,
    idToken: value.id_token,
    accountId: identity.accountId,
    expiresAt,
  }
}

export function parseCodexTokens(secret: string): CodexTokens | null {
  try {
    const value: unknown = JSON.parse(secret)
    if (
      !isRecord(value) ||
      !token(value.accessToken) ||
      !token(value.refreshToken) ||
      !token(value.idToken) ||
      !token(value.accountId) ||
      typeof value.expiresAt !== 'number' ||
      !Number.isSafeInteger(value.expiresAt) ||
      value.expiresAt <= 0
    )
      return null
    if (parseCodexIdentity(value.idToken)?.accountId !== value.accountId)
      return null
    return {
      accessToken: value.accessToken,
      refreshToken: value.refreshToken,
      idToken: value.idToken,
      accountId: value.accountId,
      expiresAt: value.expiresAt,
    }
  } catch {
    return null
  }
}
