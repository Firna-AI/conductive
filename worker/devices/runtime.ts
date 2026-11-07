import {
  DeviceContractError,
  deviceObject,
  deviceRequired,
} from '../../src/shared/device-read'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatStorage } from '../chat/types'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { DeviceBroker } from './broker'
import { brokerBrowserRoute, brokerOperation } from './broker-routes'
import type { DeviceOperationResult } from './internal'
import {
  DEVICE_BROKER_PREFIX,
  isDeviceAppPath,
  isDeviceMachinePath,
  workspaceDeviceRoute,
} from './paths'
import { workspaceBrowserRoute } from './workspace-browser'
import { WorkspaceDevices } from './workspace-commands'
import type { DeviceStateProjection } from './state'

/** The existing Durable Object class composes this feature without a new binding. */
export class DeviceRuntime {
  private readonly broker: DeviceBroker
  private readonly workspace: WorkspaceDevices
  private readonly env: AppEnv
  private readonly matches: (name: string) => boolean
  constructor(
    env: AppEnv,
    storage: ChatStorage,
    chat: WorkspaceChat,
    matches: (name: string) => boolean,
    alarm: (when: number) => Promise<void>,
    now: () => number = Date.now,
    projection?: DeviceStateProjection,
  ) {
    this.env = env
    this.matches = matches
    this.broker = new DeviceBroker(storage, env, alarm, now)
    this.workspace = new WorkspaceDevices(
      chat,
      env,
      storage,
      matches,
      now,
      projection,
    )
  }
  async fetch(request: Request): Promise<Response | null> {
    const path = new URL(request.url).pathname
    if (!isDeviceMachinePath(path) && !isDeviceAppPath(path)) return null
    return this.handle(request, path)
  }
  async operation(
    target: string,
    input: unknown,
  ): Promise<DeviceOperationResult> {
    try {
      if (!this.matches(deviceRequired(target)))
        throw new HttpError(
          403,
          'device_forbidden',
          'The Mac request is not available.',
        )
      const operation = deviceObject(input)
      const value = target.startsWith(DEVICE_BROKER_PREFIX)
        ? await brokerOperation(this.broker, operation)
        : await this.workspace.operation(operation)
      return { ok: true, value }
    } catch (error) {
      const failure = deviceError(error)
      return failure instanceof HttpError
        ? {
            ok: false,
            status: failure.status,
            code: failure.code,
            message: failure.message,
          }
        : {
            ok: false,
            status: 500,
            code: 'internal_error',
            message: 'The request failed. Try again.',
          }
    }
  }
  private async handle(request: Request, path: string): Promise<Response> {
    try {
      let response: Response
      if (isDeviceMachinePath(path))
        response = await this.workspace.machine(request)
      else if (workspaceDeviceRoute(path))
        response = await workspaceBrowserRoute(this.workspace, request)
      else
        response = await brokerBrowserRoute(
          this.broker,
          request,
          this.env,
          this.matches,
        )
      return privateResponse(response)
    } catch (error) {
      return privateResponse(errorResponse(deviceError(error)))
    }
  }
  async alarm(): Promise<void> {
    await this.broker.serial(() => this.broker.check())
  }
  reconcile(): Promise<void> {
    return this.workspace.reconcile()
  }

  async waiting(workspaceId: string): Promise<boolean> {
    return (await this.workspace.records.list()).some(
      (record) =>
        record.workspaceId === workspaceId && record.state === 'waiting',
    )
  }
}

function deviceError(error: unknown): unknown {
  return error instanceof DeviceContractError
    ? new HttpError(400, 'invalid_input', error.message)
    : error
}
