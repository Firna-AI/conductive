import { describe, expect, it, vi } from 'vitest'
import { DEVICE_CURRENT_PATH, type DeviceSettings } from '../../shared/device'
import { deviceObject, deviceText } from '../../shared/device-read'
import {
  FAKE_PAIRING,
  fakeMacSettings,
} from '../../test-support/fixtures/devices'
import type { FetchLike } from '../api/client'
import { createDeviceApi } from './device-api'
import { MacSettingsController } from './mac-settings'

/**
 * A Mac behind a gate: each request waits until the test lets the oldest
 * one go, and the Mac acts on the requests in the order that they reach it.
 */
function gatedMac() {
  let settings: DeviceSettings = fakeMacSettings()
  let open = true
  const waiting: (() => void)[] = []
  const handled: string[] = []
  const fetch: FetchLike = async (input, init) => {
    const request = new Request(
      new URL(String(input), 'https://app.test'),
      init,
    )
    if (!open) await new Promise<void>((resolve) => waiting.push(resolve))
    const path = new URL(request.url).pathname
    if (path === DEVICE_CURRENT_PATH) {
      handled.push('read pairing')
      return Response.json({ device: FAKE_PAIRING })
    }
    if (request.method === 'POST') {
      const body: unknown = await request.json()
      const command = deviceText(
        deviceObject(deviceObject(body).operation).command,
      )
      handled.push(`remove ${command}`)
      settings = {
        ...settings,
        alwaysAllowedCommands: settings.alwaysAllowedCommands.filter(
          (item) => item !== command,
        ),
      }
    } else {
      handled.push('read settings')
    }
    return Response.json({ ...FAKE_PAIRING, settings })
  }
  return {
    fetch,
    handled,
    waiting,
    hold: () => {
      open = false
    },
  }
}

describe('MacSettingsController', () => {
  it('sends one read or change at a time, so the reply of the last one holds every change', async () => {
    const mac = gatedMac()
    const controller = new MacSettingsController(createDeviceApi(mac.fetch))
    await controller.start()
    mac.hold()
    const work = Promise.all([
      controller.refresh(),
      controller.change('command:git status', {
        action: 'remove-command',
        command: 'git status',
      }),
      controller.change('command:sw_vers', {
        action: 'remove-command',
        command: 'sw_vers',
      }),
    ])
    for (let step = 0; step < 4; step += 1) {
      await vi.waitFor(() => expect(mac.waiting).toHaveLength(1))
      mac.waiting.shift()?.()
    }
    await work
    expect(mac.handled.slice(2)).toEqual([
      'read pairing',
      'read settings',
      'remove git status',
      'remove sw_vers',
    ])
    expect(controller.get()).toMatchObject({
      kind: 'ready',
      busy: [],
      settings: { alwaysAllowedCommands: ['npm run lint'] },
    })
  })
})
