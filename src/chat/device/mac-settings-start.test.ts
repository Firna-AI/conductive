import type { DevicePairing } from '../../shared/generated/DevicePairing'
import { describe, expect, it } from 'vitest'
import { createApiClient, type FetchLike } from '../../app/api/client'
import {
  DEVICE_CURRENT_PATH,
  type DeviceSettingsResponse,
  type DeviceWorkspaceWindow,
} from '../../shared/device'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  FAKE_PAIRING,
  fakeMacSettings,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import { createDeviceApi } from './device-api'
import { MacSettingsController } from './mac-settings'
import { controlOf } from './settings-results'

const start = {
  action: 'start-workspace-until-stop',
  workspaceId: FAKE_IDS.workspace,
} as const
const startControl = controlOf(start)

/**
 * A Mac that answers at once, while `pairing` names its connection. A
 * change gets `reply`. Without a connection, the Worker refuses each read
 * of the settings and each change, as it does when the Mac is away. After
 * `failReads`, each read of the settings fails with HTTP 502, as a gateway
 * in front of the Worker answers.
 */
function fakeMac(reply: DeviceSettingsResponse) {
  let pairing: DevicePairing | null = FAKE_PAIRING
  let reads = true
  const sent: unknown[] = []
  const fetch: FetchLike = async (input, init) => {
    const request = new Request(
      new URL(String(input), 'https://app.test'),
      init,
    )
    if (new URL(request.url).pathname === DEVICE_CURRENT_PATH) {
      return Response.json({ device: pairing })
    }
    if (pairing === null) {
      const error = {
        code: 'device_unavailable',
        message: 'The Mac is not available.',
      }
      return Response.json({ error }, { status: 409 })
    }
    if (request.method !== 'POST') {
      if (!reads) return new Response('Bad gateway', { status: 502 })
      return Response.json({ ...fakeSettingsReply(), ...pairing })
    }
    sent.push(await request.json())
    return Response.json({ ...reply, ...pairing })
  }
  const controller = new MacSettingsController(
    createDeviceApi(createApiClient(fetch)),
  )
  return {
    controller,
    sent,
    pair: (next: DevicePairing | null) => {
      pairing = next
    },
    failReads: () => {
      reads = false
    },
  }
}

/** The settings of the Mac with these grants of the fake workspace. */
function withGrants(...expiresAt: (number | null)[]) {
  const workspaceWindows: DeviceWorkspaceWindow[] = expiresAt.map((end) => ({
    workspaceId: FAKE_IDS.workspace,
    workspaceName: 'Checkout address autocomplete',
    expiresAt: end,
  }))
  return { ...fakeMacSettings(), workspaceWindows }
}

describe('a start of a grant until Stop', () => {
  it.each([
    {
      listed: 'the grant until Stop',
      settings: withGrants(null),
      outcome: { status: 'done' },
    },
    {
      listed: 'no grant of the workspace',
      settings: withGrants(),
      outcome: {
        status: 'failed',
        message: 'The Mac could not change this permission. Try again.',
      },
    },
    {
      listed: 'the 15 minutes of the workspace',
      settings: withGrants(FAKE_TIME + 60_000),
      outcome: {
        status: 'failed',
        message: 'The Mac could not change this permission. Try again.',
      },
    },
  ])(
    'that the Mac calls done, with settings that list $listed, counts as that outcome',
    async ({ settings, outcome }) => {
      const mac = fakeMac(fakeSettingsReply(settings))
      await mac.controller.start()
      await mac.controller.changeOnCurrent(start)
      expect(mac.controller.get().results[startControl]?.outcome).toEqual(
        outcome,
      )
    },
  )

  it('goes through the pairing of now after a read, and fails as not reached, with nothing sent, when the read finds no Mac', async () => {
    const mac = fakeMac(fakeSettingsReply(withGrants(null)))
    await mac.controller.start()
    const next = { ...FAKE_PAIRING, connectionId: 'connection-2' }
    mac.pair(next)
    await mac.controller.changeOnCurrent(start)
    const reconnected = mac.controller.get().results[startControl]
    mac.pair(null)
    await mac.controller.changeOnCurrent(start)
    const away = mac.controller.get().results[startControl]
    expect({
      sent: mac.sent,
      reconnected: reconnected?.outcome,
      away: { outcome: away?.outcome, unreached: away?.unreached },
      shown: mac.controller.get().kind,
    }).toEqual({
      sent: [{ ...next, operation: start }],
      reconnected: { status: 'done' },
      away: {
        outcome: {
          status: 'failed',
          message: 'This Mac is not available. Try again once it connects.',
        },
        unreached: true,
      },
      shown: 'unavailable',
    })
  })

  it('sends nothing after a read that fails, and fails as not reached, while the settings of the last read that worked stay as kept settings', async () => {
    const mac = fakeMac(fakeSettingsReply(withGrants(null)))
    await mac.controller.start()
    mac.failReads()
    await mac.controller.changeOnCurrent(start)
    const state = mac.controller.get()
    const result = state.results[startControl]
    expect({
      sent: mac.sent,
      kind: state.kind,
      settings: 'settings' in state ? state.settings : null,
      outcome: result?.outcome,
      unreached: result?.unreached,
    }).toEqual({
      sent: [],
      kind: 'kept',
      settings: fakeMacSettings(),
      outcome: {
        status: 'failed',
        message: 'This Mac is not available. Try again once it connects.',
      },
      unreached: true,
    })
  })
})
