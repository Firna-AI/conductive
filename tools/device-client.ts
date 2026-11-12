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
import type {
  ToolReplyReader,
  WorkspaceToolConfiguration,
} from './transport.ts'
import { ToolInputError } from './input.ts'

export type MacCommandOptions = Omit<DeviceCommandInput, 'requestId'> & {
  requestId?: string
}

export function createMacCommandClient(
  configuration: WorkspaceToolConfiguration,
  read: ToolReplyReader,
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
      return read(
        path,
        (value) => ({ request: readDeviceRecord(deviceObject(value).request) }),
        body,
      )
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
