import { DEVICE_COMMAND_PATH } from '../src/shared/device.ts'
import { TOOL_TURN_HEADER } from './context.ts'
import { isRecord } from './input.ts'

export type ToolReplyReader = <T>(
  path: string,
  parse: (value: unknown) => T,
  input?: object,
) => Promise<T>

export interface WorkspaceToolConfiguration {
  machineOrigin: string
  workspaceToken: string
  turnId?: string
}

export class WorkspaceToolError extends Error {
  readonly status: number | null
  readonly code: string | null

  constructor(
    message: string,
    status: number | null = null,
    code: string | null = null,
  ) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function createToolReplyReader(
  configuration: WorkspaceToolConfiguration,
  send: (request: Request) => Promise<Response> = fetch,
): ToolReplyReader {
  const request = async (path: string, input?: object): Promise<unknown> => {
    const mac = path.startsWith(DEVICE_COMMAND_PATH)
    const subject = mac ? 'Mac' : 'workspace'
    let response: Response
    try {
      const headers = new Headers({
        Authorization: `Bearer ${configuration.workspaceToken}`,
      })
      if (configuration.turnId) {
        headers.set(TOOL_TURN_HEADER, configuration.turnId)
      }
      if (input) headers.set('Content-Type', 'application/json')
      response = await send(
        new Request(new URL(path, configuration.machineOrigin), {
          method: input ? 'POST' : 'GET',
          headers,
          ...(input && { body: JSON.stringify(input) }),
          redirect: 'error',
        }),
      )
    } catch {
      throw new WorkspaceToolError(`The ${subject} request failed. Try again.`)
    }
    if (!response.ok) {
      const failure: unknown = await response.json().catch(() => null)
      if (
        isRecord(failure) &&
        isRecord(failure.error) &&
        typeof failure.error.code === 'string' &&
        failure.error.code &&
        typeof failure.error.message === 'string'
      ) {
        const redact = (value: string) =>
          value.replaceAll(configuration.workspaceToken, '[redacted]')
        const guidance =
          mac &&
          response.status === 403 &&
          failure.error.code === 'calling_turn_required'
            ? ' The agent turn ended. The tool cannot read the Mac command result.'
            : ''
        throw new WorkspaceToolError(
          redact(failure.error.message) + guidance,
          response.status,
          redact(failure.error.code),
        )
      }
      throw new WorkspaceToolError(
        response.status === 401
          ? 'The workspace login is not valid. Start the workspace again.'
          : `The ${subject} request failed. Check its fields and try again.`,
        response.status,
      )
    }
    try {
      return await response.json()
    } catch {
      throw new WorkspaceToolError(
        `The ${subject} reply is not valid. Try again.`,
      )
    }
  }
  return async <T>(
    path: string,
    parse: (value: unknown) => T,
    input?: object,
  ): Promise<T> => {
    const value = await request(path, input)
    try {
      return parse(value)
    } catch {
      throw new WorkspaceToolError(
        `The ${path.startsWith(DEVICE_COMMAND_PATH) ? 'Mac' : 'workspace'} reply is not valid. Try again.`,
      )
    }
  }
}
