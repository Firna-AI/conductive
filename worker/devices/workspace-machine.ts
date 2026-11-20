import type { DeviceCommandRecord } from '../../src/shared/generated/DeviceCommandRecord'
import { DEVICE_COMMAND_PATH } from '../../src/shared/device'
import {
  deviceObject,
  readDeviceCommandInput,
  readDevicePairing,
} from '../../src/shared/device-read'
import { HttpError } from '../http'
import { hash } from '../security/crypto'
import { activeDeviceSender, callingTurnId, machineWorkspace } from './access'
import { readJsonObject } from '../http/json-body'
import { workspaceOrg } from './data'
import { deviceCall } from './internal'
import { deviceBrokerName } from './paths'
import { commandPending } from './records'
import { deviceWire } from './socket'
import type { WorkspaceDevices } from './workspace-commands'
import { workspaceMacAccess } from '../secrets/capabilities-data'
import { MAC_ACCESS_OFF } from './mac-access'
import { workspaceMacAccessPeriod } from './mac-access-data'

export async function workspaceMachine(
  devices: WorkspaceDevices,
  request: Request,
): Promise<Response> {
  const workspace = await machineWorkspace(request, devices.env)
  if (!devices.matches(workspace.id))
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  const turnId = callingTurnId(request)
  const active = await activeDeviceSender(
    devices.chat,
    devices.env,
    workspace.id,
    turnId,
    workspace.tokenHash,
  )
  const path = new URL(request.url).pathname
  if (request.method === 'POST' && path === DEVICE_COMMAND_PATH) {
    const input = readDeviceCommandInput(await readJsonObject(request))
    const macAccess = await workspaceMacAccess(devices.env.DB, workspace.id)
    const target = macAccess
      ? deviceObject(
          await deviceCall(devices.env, deviceBrokerName(active.sender.id), {
            type: 'broker.target',
            userId: active.sender.id,
          }),
        )
      : { device: null }
    const device =
      target.device === null ? null : readDevicePairing(target.device)
    const now = devices.now()
    const record: DeviceCommandRecord = {
      ...input,
      requestKey: await hash(input.requestId),
      timeoutSeconds: input.timeoutSeconds ?? 60,
      longerTimeoutReason: input.longerTimeoutReason ?? null,
      orgId: await workspaceOrg(devices.env.DB, workspace.id),
      workspaceId: workspace.id,
      ...active,
      turnId,
      device,
      deviceName:
        typeof target.deviceName === 'string' ? target.deviceName : null,
      state: !macAccess ? 'failed' : device ? 'waiting' : 'unavailable',
      result: null,
      error: !macAccess
        ? MAC_ACCESS_OFF
        : device
          ? null
          : {
              code: 'device_unavailable',
              message: 'The Mac is not available.',
            },
      createdAt: now,
      startedAt: null,
      updatedAt: now,
    }
    deviceWire({
      type: 'command.request',
      request: record,
      macAccessPeriod: await workspaceMacAccessPeriod(
        devices.env.DB,
        workspace.id,
      ),
    })
    let stored = await devices.records.create(
      record,
      workspace.tokenHash,
      typeof target.sessionId === 'string' ? target.sessionId : '',
    )
    if (!macAccess && stored.state === 'waiting')
      stored = await devices.fail(stored.requestId, MAC_ACCESS_OFF.code)
    if (stored.state === 'waiting') {
      let sent = false
      try {
        sent =
          deviceObject(
            await deviceCall(devices.env, deviceBrokerName(stored.sender.id), {
              type: 'broker.dispatch',
              request: stored,
              tokenHash: workspace.tokenHash,
            }),
          ).sent === true
      } catch {
        /* A failed relay must not leave an approval waiting. */
      }
      if (!sent)
        stored = await devices.fail(
          stored.requestId,
          (await workspaceMacAccess(devices.env.DB, workspace.id))
            ? 'device_unavailable'
            : MAC_ACCESS_OFF.code,
        )
    }
    return machineResponse(stored)
  }
  if (request.method === 'GET' && path.startsWith(`${DEVICE_COMMAND_PATH}/`)) {
    const stored = await devices.records.requireKey(
      decodeURIComponent(path.slice(DEVICE_COMMAND_PATH.length + 1)),
    )
    if (stored.turnId !== turnId || stored.sender.id !== active.sender.id)
      throw new HttpError(
        403,
        'calling_turn_required',
        'Start this request from its active agent turn.',
      )
    await devices.refresh(stored)
    return machineResponse(await devices.records.require(stored.requestId))
  }
  throw new HttpError(405, 'method_not_allowed', 'Use a Mac command request.')
}

function machineResponse(record: DeviceCommandRecord) {
  return Response.json(
    { request: record },
    { status: commandPending(record) ? 202 : 200 },
  )
}
