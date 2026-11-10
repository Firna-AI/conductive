import type {
  PollCodexDeviceResponse,
  StartCodexDeviceResponse,
} from '../../src/shared/account'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { agentLoginContext } from '../chat/queries'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, isRecord } from '../http'
import { decrypt, encrypt, hash } from '../security/crypto'
import {
  claimCodexDevice,
  expireCodexDevice,
  failCodexDevice,
  finishCodexDevice,
  insertCodexDevice,
  readCodexDevice,
  releaseCodexDevice,
  type StoredCodexDevice,
} from './device-store'
import {
  CODEX_VERIFICATION_URL,
  exchangeCodexDevice,
  requestCodexDevice,
  CodexDeviceRefused,
  type DeviceAuthorization,
} from './oauth'

const FAILED = chatGptSignInCopy.causes.failed

function deviceContext(userId: string, handleHash: string): string {
  return `codex-device:${userId}:${handleHash}`
}

function publicDevice(device: StoredCodexDevice): PollCodexDeviceResponse {
  if (device.state === 'expired') return { state: 'expired' }
  if (device.state === 'failed')
    return { state: 'failed', cause: device.failureCause ?? FAILED }
  if (device.state === 'connected' && device.connectedAt !== null)
    return {
      state: 'connected',
      login: {
        agent: 'codex',
        connected: true,
        kind: 'token',
        noReuse: device.connectedNoReuse === 1,
        updatedAt: device.connectedAt,
      },
    }
  return { state: 'waiting', pollIntervalMs: device.pollIntervalMs }
}

function parseDevice(value: string): DeviceAuthorization {
  const fields: unknown = JSON.parse(value)
  if (
    !isRecord(fields) ||
    typeof fields.deviceAuthId !== 'string' ||
    typeof fields.userCode !== 'string' ||
    typeof fields.pollIntervalMs !== 'number'
  )
    throw new Error('Invalid device authorization')
  return {
    deviceAuthId: fields.deviceAuthId,
    userCode: fields.userCode,
    pollIntervalMs: fields.pollIntervalMs,
  }
}

export async function startCodexDevice(
  env: AppEnv,
  userId: string,
  dependencies: AppDependencies,
): Promise<StartCodexDeviceResponse> {
  let device: DeviceAuthorization
  try {
    device = await requestCodexDevice(dependencies)
  } catch (error) {
    throw new HttpError(
      502,
      'codex_device_failed',
      error instanceof CodexDeviceRefused
        ? chatGptSignInCopy.causes.refused
        : FAILED,
    )
  }
  const handle = dependencies.randomToken()
  const handleHash = await hash(handle)
  const now = dependencies.now()
  const ciphertext = await encrypt(
    JSON.stringify(device),
    deviceContext(userId, handleHash),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await insertCodexDevice(
    env.DB,
    userId,
    handleHash,
    ciphertext,
    device.pollIntervalMs,
    now,
  )
  return {
    handle,
    userCode: device.userCode,
    verificationUrl: CODEX_VERIFICATION_URL,
    expiresAt: now + 900_000,
    pollIntervalMs: device.pollIntervalMs,
  }
}

export async function pollCodexDevice(
  env: AppEnv,
  userId: string,
  handle: string,
  dependencies: AppDependencies,
): Promise<PollCodexDeviceResponse> {
  const handleHash = await hash(handle)
  const read = () => readCodexDevice(env.DB, userId, handleHash)
  const device = await read()
  if (!device)
    throw new HttpError(
      404,
      'codex_device_not_found',
      'The ChatGPT sign-in is not available.',
    )
  const now = dependencies.now()
  if (device.expiresAt <= now) {
    await expireCodexDevice(env.DB, userId, handleHash, now)
    return { state: 'expired' }
  }
  if (device.state === 'polling') {
    if ((device.pollClaimUntil ?? 0) <= now && device.pollClaim !== null) {
      await failCodexDevice(
        env.DB,
        userId,
        handleHash,
        device.pollClaim,
        FAILED,
      )
      return { state: 'failed', cause: FAILED }
    }
    return publicDevice(device)
  }
  if (device.state !== 'pending' || device.nextPollAt > now)
    return publicDevice(device)
  const claim = dependencies.randomToken()
  if (!(await claimCodexDevice(env.DB, userId, handleHash, claim, now))) {
    const latest = await read()
    return latest ? publicDevice(latest) : { state: 'expired' }
  }
  try {
    if (!device.ciphertext) throw new Error('The device code is missing')
    const authorization = parseDevice(
      await decrypt(
        device.ciphertext,
        deviceContext(userId, handleHash),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
    const tokens = await exchangeCodexDevice(authorization, dependencies)
    if (tokens === null) {
      await releaseCodexDevice(
        env.DB,
        userId,
        handleHash,
        claim,
        dependencies.now() + device.pollIntervalMs,
      )
    } else {
      const ciphertext = await encrypt(
        JSON.stringify(tokens),
        agentLoginContext(userId, 'codex'),
        env.BOAT_KEY_ENCRYPTION_KEY,
      )
      await finishCodexDevice(
        env.DB,
        userId,
        handleHash,
        claim,
        ciphertext,
        dependencies.now(),
      )
    }
  } catch {
    await failCodexDevice(env.DB, userId, handleHash, claim, FAILED)
  }
  const latest = await read()
  if (!latest) return { state: 'expired' }
  if (latest.expiresAt <= dependencies.now()) {
    await expireCodexDevice(env.DB, userId, handleHash, dependencies.now())
    return { state: 'expired' }
  }
  return publicDevice(latest)
}
