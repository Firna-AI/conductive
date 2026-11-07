import {
  DEVICE_COMMAND_PATH,
  machineDeviceCommandPath,
  type DeviceCommandInput,
  type DeviceCommandResponse,
} from '../src/shared/device.ts'
import {
  deviceObject,
  readDeviceCommandInput,
  readDeviceRecord,
} from '../src/shared/device-read.ts'
import type { WorkspaceToolConfiguration } from './client.ts'
import { TOOL_TURN_HEADER } from './context.ts'
import { isRecord, ToolInputError } from './input.ts'

export type MacCommandOptions = Omit<DeviceCommandInput, 'requestId'> & {
  requestId?: string
}

export function createMacCommandClient(
  configuration: WorkspaceToolConfiguration,
  send: (request: Request) => Promise<Response> = fetch,
  wait: () => Promise<void> = () =>
    new Promise((resolve) => setTimeout(resolve, 500)),
) {
  return async (options: MacCommandOptions): Promise<DeviceCommandResponse> => {
    if (!configuration.turnId)
      throw new ToolInputError('Start this request from an active agent turn.')
    const input = readDeviceCommandInput({
      ...options,
      requestId: options.requestId ?? crypto.randomUUID(),
    })
    const request = async (
      path: string,
      body?: DeviceCommandInput,
    ): Promise<DeviceCommandResponse> => {
      const headers = new Headers({
        Authorization: `Bearer ${configuration.workspaceToken}`,
        [TOOL_TURN_HEADER]: configuration.turnId ?? '',
      })
      if (body) headers.set('Content-Type', 'application/json')
      let response: Response
      try {
        response = await send(
          new Request(new URL(path, configuration.machineOrigin), {
            method: body ? 'POST' : 'GET',
            headers,
            redirect: 'error',
            ...(body && { body: JSON.stringify(body) }),
          }),
        )
      } catch {
        throw new ToolInputError('The Mac request failed. Try again.')
      }
      if (!response.ok) {
        const failure: unknown = await response.json().catch(() => null)
        const turnEnded =
          response.status === 403 &&
          isRecord(failure) &&
          isRecord(failure.error) &&
          failure.error.code === 'calling_turn_required'
        throw new ToolInputError(
          turnEnded
            ? 'The agent turn ended. The tool cannot read the Mac command result.'
            : 'The Mac request failed. Check the active turn and try again.',
        )
      }
      try {
        return {
          request: readDeviceRecord(
            deviceObject(await response.json()).request,
          ),
        }
      } catch {
        throw new ToolInputError('The Mac reply is not valid. Try again.')
      }
    }
    let reply = await request(DEVICE_COMMAND_PATH, input)
    while (
      reply.request.state === 'waiting' ||
      reply.request.state === 'running'
    ) {
      await wait()
      reply = await request(machineDeviceCommandPath(reply.request.requestKey))
    }
    return reply
  }
}
