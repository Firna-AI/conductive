import { afterEach, beforeEach, expect, it } from 'vitest'

import { DEVICE_SETTINGS_PATH } from '../../src/shared/device'
import {
  deviceObject,
  deviceRequired,
  readDeviceSettingsResponse,
} from '../../src/shared/device-read'
import { deviceFixture, WID, type DeviceFixture } from './runtime.test-support'
import {
  command,
  connected,
  ref,
  result,
  sendFrame,
  stored,
} from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('relays local settings only to the paired Mac without applying permission rules', async () => {
  const mac = await connected(fixture)
  const browserCurrent = await fixture.app('/api/devices/current')
  expect(browserCurrent.status).toBe(200)
  expect(await browserCurrent.json()).toEqual({ device: null })
  const settings = {
    deviceName: 'Sender Mac',
    alwaysAllowedCommands: [' exact command '],
    workspaceWindows: [
      {
        workspaceId: WID,
        workspaceName: 'Workspace',
        expiresAt: Date.now() + 900_000,
      },
    ],
  }
  const read = fixture.app(
    DEVICE_SETTINGS_PATH,
    undefined,
    fixture.senderToken,
    true,
  )
  const message = deviceObject(await mac.inbox.next())
  expect(message).toMatchObject({
    type: 'settings.operation',
    operation: { action: 'read' },
  })
  mac.socket.send(
    JSON.stringify({
      type: 'settings.result',
      operationId: 'wrong-operation',
      settings,
      outcome: { status: 'done' },
    }),
  )
  mac.socket.send(
    JSON.stringify({
      type: 'settings.result',
      operationId: deviceRequired(message.operationId),
      settings,
      outcome: { status: 'done' },
    }),
  )
  const response = await read
  expect(response.status).toBe(200)
  expect(readDeviceSettingsResponse(await response.json())).toEqual({
    ...mac.device,
    settings,
    outcome: { status: 'done' },
  })
  const other = await fixture.tokenFor('sender', 'unpaired')
  expect(
    (
      await fixture.app(
        DEVICE_SETTINGS_PATH,
        {
          ...mac.device,
          operation: { action: 'remove-command', command: ' exact command ' },
        },
        other,
        true,
      )
    ).status,
  ).toBe(409)
  for (const [operation, outcome] of [
    [
      { action: 'remove-command', command: ' exact command ' },
      {
        status: 'done-not-saved',
        message: 'The settings file could not be saved.',
      },
    ],
    [
      { action: 'stop-workspace', workspaceId: WID },
      {
        status: 'failed',
        message: 'The workspace permission could not be changed.',
      },
    ],
    [{ action: 'extend-workspace', workspaceId: WID }, { status: 'done' }],
  ] as const) {
    const pending = fixture.app(
      DEVICE_SETTINGS_PATH,
      { ...mac.device, operation },
      fixture.senderToken,
      true,
    )
    const relay = deviceObject(await mac.inbox.next())
    expect(relay).toMatchObject({ type: 'settings.operation', operation })
    mac.socket.send(
      JSON.stringify({
        type: 'settings.result',
        operationId: deviceRequired(relay.operationId),
        settings: {
          ...settings,
          alwaysAllowedCommands: [],
          workspaceWindows: [],
        },
        outcome,
      }),
    )
    const reply = await pending
    expect(reply.status).toBe(200)
    expect(readDeviceSettingsResponse(await reply.json())).toEqual({
      ...mac.device,
      settings: {
        ...settings,
        alwaysAllowedCommands: [],
        workspaceWindows: [],
      },
      outcome,
    })
  }
})

it('rejects Extend without a workspace ID before relaying it to the Mac', async () => {
  const mac = await connected(fixture)
  const response = await fixture.app(
    DEVICE_SETTINGS_PATH,
    { ...mac.device, operation: { action: 'extend-workspace' } },
    fixture.senderToken,
    true,
  )
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    error: {
      code: 'invalid_input',
      message: 'Complete the Mac request fields.',
    },
  })
  await sendFrame(mac, { type: 'device.ping' })
})

it('rejects only the oversized settings waiter and keeps commands and other settings operations alive', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac)
  await sendFrame(mac, { type: 'command.approved', ...ref() })
  const oversized = fixture.app(
    DEVICE_SETTINGS_PATH,
    undefined,
    fixture.senderToken,
    true,
  )
  const first = deviceObject(await mac.inbox.next())
  const other = fixture.app(
    DEVICE_SETTINGS_PATH,
    { ...mac.device, operation: { action: 'remove-command', command: 'pwd' } },
    fixture.senderToken,
    true,
  )
  const second = deviceObject(await mac.inbox.next())
  mac.socket.send(
    JSON.stringify({
      type: 'settings.failed',
      operationId: 'unrelated-operation',
      code: 'settings_result_too_large',
    }),
  )
  mac.socket.send(
    JSON.stringify({
      type: 'settings.failed',
      operationId: first.operationId,
      code: 'settings_result_too_large',
    }),
  )
  const response = await oversized
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'settings_result_too_large',
      message: 'The Mac settings reply is too large.',
    },
  })
  const settings = {
    deviceName: 'Sender Mac',
    alwaysAllowedCommands: [],
    workspaceWindows: [],
  }
  await sendFrame(mac, {
    type: 'settings.result',
    operationId: deviceRequired(second.operationId),
    settings,
    outcome: { status: 'done' },
  })
  const reply = await other
  expect(reply.status).toBe(200)
  expect(readDeviceSettingsResponse(await reply.json())).toEqual({
    ...mac.device,
    settings,
    outcome: { status: 'done' },
  })
  expect((await stored(fixture)).state).toBe('running')
  await sendFrame(mac, { type: 'command.result', ...ref(), result })
  expect(await stored(fixture)).toMatchObject({ state: 'completed', result })
})
