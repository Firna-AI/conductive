import { DeviceContractError } from '../../src/shared/device-read'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatStorage } from '../chat/types'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { DeviceBroker } from './broker'
import { brokerBrowserRoute, brokerOperation } from './broker-routes'
import { deviceInternal } from './internal'
import {
  DEVICE_BROKER_PREFIX,
  DEVICE_INTERNAL_PATH,
  isDeviceAppPath,
  isDeviceMachinePath,
  workspaceDeviceRoute,
} from './paths'
import { workspaceBrowserRoute } from './workspace-browser'
import { WorkspaceDevices } from './workspace-commands'

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
  ) {
    this.env = env
    this.matches = matches
    this.broker = new DeviceBroker(storage, env, alarm)
    this.workspace = new WorkspaceDevices(chat, env, storage, matches)
  }
  async fetch(request: Request): Promise<Response | null> {
    const path = new URL(request.url).pathname
    if (
      path !== DEVICE_INTERNAL_PATH &&
      !isDeviceMachinePath(path) &&
      !isDeviceAppPath(path)
    )
      return null
    try {
      let response: Response
      if (path === DEVICE_INTERNAL_PATH) {
        const { target, operation } = await deviceInternal(
          request,
          this.env,
          this.matches,
        )
        response = target.startsWith(DEVICE_BROKER_PREFIX)
          ? await brokerOperation(this.broker, operation)
          : await this.workspace.operation(operation)
      } else if (isDeviceMachinePath(path))
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
      return privateResponse(
        errorResponse(
          error instanceof DeviceContractError
            ? new HttpError(400, 'invalid_input', error.message)
            : error,
        ),
      )
    }
  }
  async alarm(): Promise<void> {
    await this.broker.serial(() => this.broker.check())
  }
  reconcile(): Promise<void> {
    return this.workspace.reconcile()
  }
}
