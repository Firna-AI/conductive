import {
  deviceObject,
  deviceRequired,
  readDeviceResult,
  readDeviceSettings,
  readDeviceSettingsOutcome,
} from '../../src/shared/device-read'
import { HttpError } from '../http'
import type { DeviceBroker } from './broker'
import type { DeviceConnection } from './broker-types'

export async function receiveDeviceMessage(
  broker: DeviceBroker,
  connection: DeviceConnection,
  value: unknown,
): Promise<void> {
  if (!(await broker.check())) return
  const message = deviceObject(value)
  if (message.type === 'device.ping') {
    connection.lastSeen = broker.now()
    connection.send({ type: 'device.pong' })
    return
  }
  if (message.type === 'device.sleep') return broker.drop()
  if (
    message.type === 'settings.result' ||
    message.type === 'settings.failed'
  ) {
    const id = deviceRequired(message.operationId)
    const waiter = broker.settings.get(id)
    if (!waiter || waiter.connectionId !== connection.device.connectionId)
      return
    if (message.type === 'settings.failed') {
      if (message.code !== 'settings_result_too_large')
        throw new Error('Unknown settings failure.')
      broker.settings.delete(id)
      waiter.cancel()
      waiter.reject(
        new HttpError(
          502,
          'settings_result_too_large',
          'The Mac settings reply is too large.',
        ),
      )
      return
    }
    const settings = readDeviceSettings(message.settings)
    const outcome = readDeviceSettingsOutcome(message.outcome)
    broker.settings.delete(id)
    waiter.cancel()
    waiter.resolve({ ...connection.device, settings, outcome })
    return
  }
  const id = deviceRequired(message.requestId)
  const workspaceId = deviceRequired(message.workspaceId)
  const item = (await broker.pending()).find(
    ({ request }) =>
      request.requestId === id && request.workspaceId === workspaceId,
  )
  if (
    !item ||
    item.request.device?.connectionId !== connection.device.connectionId ||
    item.sessionId !== connection.sessionId
  )
    return
  if (message.type === 'command.approved') {
    if (item.request.state !== 'waiting') return
    const updated = await broker.update(item, { state: 'running' })
    if (updated.state !== 'running') {
      connection.send({
        type: 'command.cancel',
        workspaceId: item.request.workspaceId,
        requestId: item.request.requestId,
      })
      await broker.forget(item)
      return
    }
    item.request = updated
    // Allow the execution limit and one transport heartbeat for the result.
    item.executionDeadline =
      (updated.startedAt ?? broker.now()) +
      item.request.timeoutSeconds * 1000 +
      10_000
    await broker.store(item)
    return
  }
  if (message.type === 'command.denied') {
    if (item.request.state !== 'waiting') return
    await broker.update(item, { state: 'denied' })
  } else if (message.type === 'command.result') {
    if (item.request.state !== 'running') return
    const result = readDeviceResult(message.result)
    await broker.update(item, {
      state: result.timedOut ? 'timed-out' : 'completed',
      result,
    })
  } else if (message.type === 'command.failed') {
    await broker.update(item, {
      state: 'failed',
      error: {
        code: 'command_failed',
        message: deviceRequired(message.message),
      },
    })
  } else {
    throw new Error('Unknown device message.')
  }
  await broker.forget(item)
}
