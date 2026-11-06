import { deviceObject, readDevicePairing } from '../../src/shared/device-read'
import { findChatWorkspace } from '../chat/queries'
import { HttpError } from '../http'
import { DESKTOP_ORIGIN } from '../security/desktop-contract'
import { deviceBrowserGate } from './body'
import { readJsonObject } from '../http/json-body'
import { approvalAction } from './broker-routes'
import { deviceCall } from './internal'
import { deviceBrokerName, workspaceDeviceRoute } from './paths'
import type { WorkspaceDevices } from './workspace-commands'

export async function workspaceBrowserRoute(
  devices: WorkspaceDevices,
  request: Request,
): Promise<Response> {
  const context = await deviceBrowserGate(request, devices.env, Date.now())
  const path = workspaceDeviceRoute(new URL(request.url).pathname)
  if (
    !path ||
    !context.org ||
    context.org.id !== path.orgId ||
    !devices.matches(path.workspaceId) ||
    !(await findChatWorkspace(devices.env.DB, context.org.id, path.workspaceId))
  )
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  if (request.headers.has('Upgrade'))
    throw new HttpError(405, 'method_not_allowed', 'Use a Mac command request.')
  await devices.records.run(() => devices.records.flush())
  if (request.method === 'GET') {
    await devices.reconcile()
    if (path.requestId)
      return Response.json({
        request: await devices.records.require(path.requestId),
      })
    return Response.json({ requests: await devices.records.list() })
  }
  if (request.method === 'POST' && path.requestId && path.approval) {
    const record = await devices.records.require(path.requestId)
    const body = await readJsonObject(request)
    const pairing = readDevicePairing(body)
    if (
      request.headers.get('Origin') !== DESKTOP_ORIGIN ||
      context.user.id !== record.sender.id ||
      context.sessionId !==
        (await devices.records.desktopSession(record.requestId)) ||
      pairing.connectionId !== record.device?.connectionId ||
      pairing.deviceId !== record.device.deviceId
    )
      throw new HttpError(
        403,
        'device_forbidden',
        'Open this request on the connected Mac.',
      )
    const access = await devices.validation(
      record,
      await devices.records.tokenHash(record.requestId),
    )
    if (!access.valid || record.state !== 'waiting') {
      await devices.refresh(record)
      throw new HttpError(
        409,
        'device_request_not_pending',
        'The Mac request no longer waits for approval.',
      )
    }
    const response = deviceObject(
      await deviceCall(devices.env, deviceBrokerName(record.sender.id), {
        type: 'broker.approval',
        userId: context.user.id,
        sessionId: context.sessionId,
        requestId: record.requestId,
        workspaceId: record.workspaceId,
        device: pairing,
        action: approvalAction(body.action),
      }),
    )
    return Response.json(response, { status: 202 })
  }
  throw new HttpError(405, 'method_not_allowed', 'Use a Mac command request.')
}
