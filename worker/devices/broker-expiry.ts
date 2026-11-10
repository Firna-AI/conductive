import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { DeviceBroker } from './broker'
import type { BrokerRequest, DeviceConnection } from './broker-types'

export async function expireDeviceCommand(
  broker: DeviceBroker,
  connection: DeviceConnection,
  item: BrokerRequest,
): Promise<void> {
  try {
    connection.send({
      type: 'command.cancel',
      requestId: item.request.requestId,
      workspaceId: item.request.workspaceId,
    })
  } catch {
    /* An offline transport must still settle its pending work. */
  }
  try {
    await broker.update(item, {
      state: 'timed-out',
      result: {
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: true,
        truncated: false,
      },
    })
  } catch (error) {
    captureUnexpectedWorkerFailure('device_state_update_failed', error)
    /* The workspace may already have deleted its request state. */
  } finally {
    await broker.forget(item)
  }
}
