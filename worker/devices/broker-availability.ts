import { deviceObject } from '../../src/shared/device-read'
import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import { deviceCall } from './internal'
import type { DeviceBroker } from './broker'
import type { BrokerRequest } from './broker-types'

export async function validateDeviceRequest(
  broker: DeviceBroker,
  item: BrokerRequest,
): Promise<boolean> {
  try {
    const reply = deviceObject(
      await deviceCall(broker.env, item.request.workspaceId, {
        type: 'workspace.validate',
        requestId: item.request.requestId,
        tokenHash: item.tokenHash,
      }),
    )
    return reply.valid === true
  } catch (error) {
    captureUnexpectedWorkerFailure('device_relay_failed', error)
    return false
  }
}

export async function invalidateDeviceRequest(
  broker: DeviceBroker,
  item: BrokerRequest,
): Promise<void> {
  let reply: Record<string, unknown>
  try {
    reply = deviceObject(
      await deviceCall(broker.env, item.request.workspaceId, {
        type: 'workspace.validate',
        requestId: item.request.requestId,
        tokenHash: item.tokenHash,
      }),
    )
  } catch (error) {
    captureUnexpectedWorkerFailure('device_relay_failed', error)
    return broker.unavailable(item)
  }
  if (reply.reason !== 'turn_ended') return broker.unavailable(item)
  try {
    broker.connection?.send({
      type: 'command.cancel',
      workspaceId: item.request.workspaceId,
      requestId: item.request.requestId,
    })
  } catch {
    /* Still settle and forget work after transport loss. */
  }
  try {
    await broker.update(item, {
      state: 'failed',
      error: { code: 'turn_ended', message: 'The agent turn has ended.' },
    })
  } catch (error) {
    captureUnexpectedWorkerFailure('device_state_update_failed', error)
    /* Deleted workspace state cannot block unrelated work. */
  } finally {
    await broker.forget(item)
  }
}
