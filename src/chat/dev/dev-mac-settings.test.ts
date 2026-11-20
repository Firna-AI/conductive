import { afterEach, expect, it, vi } from 'vitest'

import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import {
  deviceObject,
  readDeviceSettingsResponse,
} from '../../shared/device-read'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_PAIRING } from '../../test-support/fixtures/devices'
import { DevBackend } from './dev-backend'
import { readOptions } from './dev-options'

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('starts an in-memory development grant with done and runs waiting commands even when disk writes fail', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  const backend = await DevBackend.create(
    readOptions('?app=mac&mac=several&state=input&change=done-not-saved'),
    { now: () => 1_800_000_000_000 },
  )
  try {
    const response = await backend.fetch(DEVICE_SETTINGS_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...backend.mac.pairing,
        operation: {
          action: 'start-workspace-until-stop',
          workspaceId: FAKE_IDS.workspace,
        },
      }),
    })
    expect(response.status).toBe(200)
    expect(readDeviceSettingsResponse(await response.json()).outcome).toEqual({
      status: 'done',
    })
    expect(backend.mac.settings.workspaceWindows).toEqual([
      {
        workspaceId: FAKE_IDS.workspace,
        workspaceName: 'Checkout address autocomplete',
        expiresAt: null,
        macAccessPeriod: 0,
      },
    ])
    expect(backend.mac.requests.map(({ state }) => state)).toEqual([
      'running',
      'running',
    ])
    expect(backend.workspace.state).toBe('working')
    vi.advanceTimersByTime(1_600)
    expect(backend.mac.requests.map(({ state }) => state)).toEqual([
      'completed',
      'completed',
    ])
  } finally {
    backend.dispose()
  }
})

it('makes a fake start readable through settings and leaves browser settings unavailable', async () => {
  const server = new FakeApiServer({ onMac: true })
  const response = await server.fetch(DEVICE_SETTINGS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...FAKE_PAIRING,
      operation: {
        action: 'start-workspace-until-stop',
        workspaceId: FAKE_IDS.workspace,
      },
    }),
  })
  expect(response.status).toBe(200)
  const result = readDeviceSettingsResponse(await response.json())
  expect(result.outcome).toEqual({ status: 'done' })
  expect(result.settings.workspaceWindows).toEqual([
    {
      workspaceId: FAKE_IDS.workspace,
      workspaceName: 'Checkout address autocomplete',
      expiresAt: null,
      macAccessPeriod: 0,
    },
  ])
  const read = await server.fetch(DEVICE_SETTINGS_PATH)
  expect(deviceObject(await read.json()).settings).toEqual(result.settings)
  const browser = new FakeApiServer()
  expect((await browser.fetch(DEVICE_SETTINGS_PATH)).status).toBe(409)
})
