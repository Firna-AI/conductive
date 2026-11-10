import {
  deviceObject,
  deviceRequired,
  readDevicePairing,
} from '../../src/shared/device-read'
import type {
  DeviceApprovalAction,
  DeviceSettingsAction,
} from '../../src/shared/device'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { readCookie } from '../security/cookies'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../security/desktop-contract'
import type { DeviceBroker } from './broker'
import { deviceBrowserGate } from './body'
import { readJsonObject } from '../http/json-body'
import { requestBearer } from './access'
import { deviceBrokerName } from './paths'
import { deviceFrame, deviceWire } from './socket'
import type { DeviceOperationValue } from './internal'

export function approvalAction(value: unknown): DeviceApprovalAction {
  switch (value) {
    case 'deny':
    case 'allow':
    case 'always-allow':
    case 'allow-workspace-15-minutes':
      return value
    default:
      throw new HttpError(400, 'invalid_input', 'Choose a command permission.')
  }
}
function settingsAction(value: unknown): DeviceSettingsAction {
  const input = deviceObject(value)
  if (input.action === 'read') return { action: 'read' }
  if (input.action === 'remove-command')
    return { action: input.action, command: deviceRequired(input.command) }
  if (input.action === 'stop-workspace')
    return {
      action: input.action,
      workspaceId: deviceRequired(input.workspaceId),
    }
  throw new HttpError(400, 'invalid_input', 'Choose a Mac setting to change.')
}

export async function brokerBrowserRoute(
  broker: DeviceBroker,
  request: Request,
  env: AppEnv,
  matches: (name: string) => boolean,
): Promise<Response> {
  const context = await deviceBrowserGate(request, env, broker.now())
  if (!matches(deviceBrokerName(context.user.id)))
    throw new HttpError(
      403,
      'device_forbidden',
      'Open this request on the connected Mac.',
    )
  const url = new URL(request.url)
  if (
    url.pathname === '/api/devices/current' &&
    request.method === 'GET' &&
    !request.headers.has('Upgrade') &&
    request.headers.get('Origin') !== DESKTOP_ORIGIN
  )
    return Response.json({ device: null })
  if (request.headers.get('Origin') !== DESKTOP_ORIGIN)
    throw new HttpError(
      403,
      'device_forbidden',
      'Open this request on the connected Mac.',
    )
  if (url.pathname === '/api/devices/connect') {
    if (
      request.method !== 'GET' ||
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket' ||
      !requestBearer(request) ||
      requestBearer(request) !== readCookie(request, DESKTOP_SESSION_COOKIE)
    )
      throw new HttpError(
        403,
        'device_forbidden',
        'Open the Mac app to connect this Mac.',
      )
    const deviceId = deviceRequired(url.searchParams.get('deviceId'))
    const pair = new WebSocketPair()
    const server = pair[1]
    server.accept()
    const connection = {
      device: { deviceId, connectionId: crypto.randomUUID() },
      deviceName: url.searchParams.get('deviceName')?.trim()
        ? url.searchParams.get('deviceName')
        : null,
      userId: context.user.id,
      sessionId: context.sessionId,
      lastSeen: broker.now(),
      send: (message: import('../../src/shared/device').WorkerToDevice) =>
        server.send(deviceWire(message)),
      close: (code = 1000, reason = 'The Mac is not available.') =>
        server.close(code, reason),
    }
    await broker.serial(() => broker.attach(connection))
    server.addEventListener('message', (event) => {
      let value: unknown
      try {
        value = deviceFrame(event.data)
      } catch {
        void broker.reporting.background(() =>
          broker.serial(() =>
            broker.connection === connection
              ? broker.drop()
              : Promise.resolve(),
          ),
        )
        return
      }
      void broker.reporting.background(() => broker.receive(connection, value))
    })
    const close = () => {
      void broker.reporting.background(() =>
        broker.serial(() =>
          broker.connection === connection ? broker.drop() : Promise.resolve(),
        ),
      )
    }
    server.addEventListener('close', close)
    server.addEventListener('error', close)
    return new Response(null, { status: 101, webSocket: pair[0] })
  }
  if (request.headers.has('Upgrade'))
    throw new HttpError(405, 'method_not_allowed', 'Use a Mac app connection.')
  const device = await broker.serial(() =>
    broker.current(context.user.id, context.sessionId),
  )
  if (url.pathname === '/api/devices/current' && request.method === 'GET')
    return Response.json({ device })
  if (
    url.pathname === '/api/devices/current/settings' &&
    ['GET', 'POST'].includes(request.method)
  ) {
    if (!device)
      throw new HttpError(
        409,
        'device_unavailable',
        'The Mac is not available.',
      )
    let operation: DeviceSettingsAction = { action: 'read' }
    if (request.method === 'POST') {
      const body = await readJsonObject(request)
      broker.requirePairing(body, context.user.id, context.sessionId)
      operation = settingsAction(body.operation)
      if (operation.action === 'read')
        throw new HttpError(
          400,
          'invalid_input',
          'Choose a Mac setting to change.',
        )
    }
    const connection = broker.requirePairing(
      device,
      context.user.id,
      context.sessionId,
    )
    return Response.json(await broker.relaySettings(connection, operation))
  }
  throw new HttpError(404, 'not_found', 'The page is not available.')
}

export async function brokerOperation(
  broker: DeviceBroker,
  operation: Record<string, unknown>,
): Promise<DeviceOperationValue> {
  if (operation.type === 'broker.target')
    return broker.serial(async () => {
      const valid = await broker.check()
      const connection =
        valid && broker.connection?.userId === deviceRequired(operation.userId)
          ? broker.connection
          : null
      return {
        device: connection?.device ?? null,
        deviceName: connection?.deviceName ?? null,
        sessionId: connection?.sessionId ?? null,
      }
    })
  if (operation.type === 'broker.cancel')
    return broker.serial(async () => {
      const item = (await broker.pending()).find(
        ({ request }) =>
          request.workspaceId === operation.workspaceId &&
          request.requestId === operation.requestId,
      )
      if (item) {
        broker.connection?.send({
          type: 'command.cancel',
          workspaceId: item.request.workspaceId,
          requestId: item.request.requestId,
        })
        await broker.forget(item)
      }
      return { cancelled: true }
    })
  if (operation.type === 'broker.current')
    return {
      device: await broker.serial(() =>
        broker.current(
          deviceRequired(operation.userId),
          deviceRequired(operation.sessionId),
        ),
      ),
    }
  if (operation.type === 'broker.dispatch')
    return {
      sent: await broker.serial(() =>
        broker.dispatch(operation.request, deviceRequired(operation.tokenHash)),
      ),
    }
  if (operation.type === 'broker.approval') {
    return broker.serial(async () => {
      if (!(await broker.check()))
        throw new HttpError(
          409,
          'device_unavailable',
          'The Mac is not available.',
        )
      const pairing = readDevicePairing(operation.device)
      const connection = broker.requirePairing(
        pairing,
        deviceRequired(operation.userId),
        deviceRequired(operation.sessionId),
      )
      const id = deviceRequired(operation.requestId)
      const workspaceId = deviceRequired(operation.workspaceId)
      const item = (await broker.pending()).find(
        ({ request }) =>
          request.requestId === id && request.workspaceId === workspaceId,
      )
      if (
        !item ||
        item.request.state !== 'waiting' ||
        !(await broker.valid(item))
      )
        throw new HttpError(
          409,
          'device_request_not_pending',
          'The Mac request no longer waits for approval.',
        )
      connection.send({
        type: 'command.approval',
        operationId: crypto.randomUUID(),
        workspaceId,
        requestId: id,
        action: approvalAction(operation.action),
      })
      return { accepted: true }
    })
  }
  if (operation.type === 'broker.check')
    return broker.serial(async () => {
      if (!(await broker.check())) return { live: false, known: false }
      const pairing = readDevicePairing(operation.device)
      const live =
        broker.connection?.device.connectionId === pairing.connectionId &&
        broker.connection.device.deviceId === pairing.deviceId
      const known =
        live &&
        (await broker.pending()).some(
          ({ request }) =>
            request.workspaceId === operation.workspaceId &&
            request.requestId === operation.requestId,
        )
      return { live, known }
    })
  throw new HttpError(404, 'not_found', 'The page is not available.')
}
