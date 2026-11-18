import type {
  PollCodexDeviceResponse,
  StartCodexDeviceResponse,
} from '../../shared/account'
import { choice, count, nested, record, text } from './parse'
import { readLogin } from './read-core'

/** The states of a ChatGPT sign-in of Codex, as a poll answers them. */
const CODEX_DEVICE_STATES = [
  'waiting',
  'connected',
  'expired',
  'failed',
] as const satisfies readonly PollCodexDeviceResponse['state'][]

/** A started ChatGPT sign-in: its handle, its code, and its times. */
export function readCodexDeviceStart(value: unknown): StartCodexDeviceResponse {
  const start = record(value, 'ChatGPT sign-in')
  return {
    handle: text(start, 'handle'),
    userCode: text(start, 'userCode'),
    verificationUrl: text(start, 'verificationUrl'),
    expiresAt: count(start, 'expiresAt'),
    pollIntervalMs: count(start, 'pollIntervalMs'),
  }
}

/** The state of a ChatGPT sign-in, with the connected login at the end. */
export function readCodexDevicePoll(value: unknown): PollCodexDeviceResponse {
  const poll = record(value, 'ChatGPT sign-in')
  const state = choice(poll, 'state', CODEX_DEVICE_STATES)
  switch (state) {
    case 'waiting':
      return { state, pollIntervalMs: count(poll, 'pollIntervalMs') }
    case 'connected':
      return { state, login: nested(poll, 'login', readLogin) }
    case 'expired':
      return { state }
    case 'failed':
      return { state, cause: text(poll, 'cause') }
  }
}
