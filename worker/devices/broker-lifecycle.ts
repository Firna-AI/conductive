import { DEVICE_HEARTBEAT_MS, DEVICE_LEASE_MS } from '../../src/shared/device'
import { HttpError } from '../http'
import { desktopSessionAlive } from './access'
import type { DeviceBroker } from './broker'
import { expireDeviceCommand } from './broker-expiry'

export async function dropBroker(
  broker: DeviceBroker,
  code: number,
  reason: string,
): Promise<void> {
  const connection = broker.connection
  broker.connection = null
  try {
    await connection?.retire?.()
  } finally {
    try {
      connection?.close(code, reason)
    } catch {
      /* Settle requests even when the transport has already failed. */
    }
    for (const waiter of broker.settings.values()) {
      waiter.cancel()
      waiter.reject(
        new HttpError(409, 'device_unavailable', 'The Mac is not available.'),
      )
    }
    broker.settings.clear()
  }
  await broker.alarm(null)
  for (const item of await broker.pending()) await broker.unavailable(item)
}

export async function checkBroker(broker: DeviceBroker): Promise<boolean> {
  const connection = broker.connection
  let alive = false
  if (connection) {
    connection.lastSeen = Math.max(
      connection.lastSeen,
      connection.heartbeatAt?.() ?? 0,
    )
    try {
      alive =
        broker.now() - connection.lastSeen < DEVICE_LEASE_MS &&
        !!(await desktopSessionAlive(
          broker.env.DB,
          connection.sessionId,
          connection.userId,
          broker.now(),
        ))
    } catch {
      alive = false
    }
  }
  if (!connection || !alive) {
    await broker.drop()
    return false
  }
  connection.nextCheckAt = broker.now() + DEVICE_HEARTBEAT_MS
  await connection.persist?.()
  await scheduleBroker(broker)
  for (const item of await broker.pending()) {
    if (!(await broker.valid(item))) await broker.invalid(item)
    else if (
      item.executionDeadline !== null &&
      item.executionDeadline <= broker.now()
    )
      await expireDeviceCommand(broker, connection, item)
  }
  await scheduleBroker(broker)
  return true
}

export async function scheduleBroker(broker: DeviceBroker): Promise<void> {
  const connection = broker.connection
  if (!connection) return
  await broker.alarm(
    Math.min(
      connection.lastSeen + DEVICE_LEASE_MS,
      connection.nextCheckAt ?? broker.now() + DEVICE_HEARTBEAT_MS,
      ...(await broker.pending()).flatMap((item) =>
        item.executionDeadline === null ? [] : [item.executionDeadline],
      ),
    ),
  )
}
