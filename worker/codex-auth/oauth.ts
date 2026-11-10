import type { AppDependencies } from '../env'
import { isRecord } from '../http'
import { parseOAuthCodexTokens, type CodexTokens } from './tokens'

const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
export const CODEX_VERIFICATION_URL = 'https://auth.openai.com/codex/device'
const OAUTH_URL = 'https://auth.openai.com/oauth/token'
const DEVICE_URL = 'https://auth.openai.com/api/accounts/deviceauth'
const MIN_POLL_SECONDS = 5

export type CodexAuthDependencies = Pick<AppDependencies, 'fetch' | 'now'> & {
  wait?: (milliseconds: number) => Promise<void>
}

export interface DeviceAuthorization {
  deviceAuthId: string
  userCode: string
  pollIntervalMs: number
}

export class CodexDeviceRefused extends Error {}

function required(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error('Invalid OpenAI reply')
  return value
}

function post(
  url: string,
  body: Record<string, string> | URLSearchParams,
  signal = AbortSignal.timeout(30_000),
): Request {
  const form = body instanceof URLSearchParams
  return new Request(url, {
    method: 'POST',
    redirect: 'manual',
    signal,
    headers: {
      'Content-Type': form
        ? 'application/x-www-form-urlencoded'
        : 'application/json',
    },
    body: form ? body.toString() : JSON.stringify(body),
  })
}

async function readReply(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error('OpenAI refused the request')
  }
  const value: unknown = await response.json()
  if (!isRecord(value)) throw new Error('Invalid OpenAI reply')
  return value
}

export async function requestCodexDevice(
  dependencies: CodexAuthDependencies,
): Promise<DeviceAuthorization> {
  const response = await dependencies.fetch(
    post(`${DEVICE_URL}/usercode`, { client_id: CODEX_CLIENT_ID }),
  )
  if (response.status === 404) {
    await response.body?.cancel()
    throw new CodexDeviceRefused()
  }
  const value = await readReply(response)
  const seconds =
    value.interval === undefined
      ? MIN_POLL_SECONDS
      : typeof value.interval === 'string' &&
          /^\d+$/.test(value.interval.trim())
        ? Number(value.interval)
        : NaN
  if (!Number.isSafeInteger(seconds * 1000) || seconds < 0)
    throw new Error('Invalid OpenAI interval')
  return {
    deviceAuthId: required(value.device_auth_id),
    userCode: required(value.user_code ?? value.usercode),
    pollIntervalMs: Math.max(MIN_POLL_SECONDS, seconds) * 1000,
  }
}

export async function exchangeCodexDevice(
  device: DeviceAuthorization,
  dependencies: CodexAuthDependencies,
): Promise<CodexTokens | null> {
  const signal = AbortSignal.timeout(30_000)
  const response = await dependencies.fetch(
    post(
      `${DEVICE_URL}/token`,
      {
        device_auth_id: device.deviceAuthId,
        user_code: device.userCode,
      },
      signal,
    ),
  )
  if (response.status === 403 || response.status === 404) {
    await response.body?.cancel()
    return null
  }
  const value = await readReply(response)
  required(value.code_challenge)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: required(value.authorization_code),
    code_verifier: required(value.code_verifier),
    client_id: CODEX_CLIENT_ID,
    redirect_uri: 'https://auth.openai.com/deviceauth/callback',
  })
  const tokens = parseOAuthCodexTokens(
    await readReply(await dependencies.fetch(post(OAUTH_URL, body, signal))),
    dependencies.now(),
  )
  if (!tokens) throw new Error('Invalid OpenAI sign-in')
  return tokens
}

export async function refreshCodexTokens(
  previous: CodexTokens,
  dependencies: CodexAuthDependencies,
): Promise<CodexTokens> {
  const body = {
    grant_type: 'refresh_token',
    client_id: CODEX_CLIENT_ID,
    refresh_token: previous.refreshToken,
  }
  const value = await readReply(await dependencies.fetch(post(OAUTH_URL, body)))
  const tokens = parseOAuthCodexTokens(
    {
      ...value,
      id_token:
        value.id_token === undefined ? previous.idToken : value.id_token,
      refresh_token:
        value.refresh_token === undefined
          ? previous.refreshToken
          : value.refresh_token,
    },
    dependencies.now(),
  )
  if (!tokens) throw new Error('Invalid OpenAI sign-in')
  return tokens
}
