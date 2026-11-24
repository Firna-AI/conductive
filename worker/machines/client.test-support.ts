import type { HostStreamPort } from '../../src/shared/generated/HostStreamPort'
import { number, record, string } from '../chat/inputs'
import type { OuterRuntime } from '../chat/integration/outer-runtime.test-support'
import { HttpError } from '../http'
import type { MachineOwner } from './identity'
import { readHostMessage } from './protocol-reader'

export function testMachineClient(outer: OuterRuntime, owner: MachineOwner) {
  const call = async (
    action: string,
    input: Record<string, unknown> = {},
  ): Promise<unknown> => {
    const response = await outer.runtime.dispatchFetch(
      outer.env.APP_ORIGIN + '/__test/machine',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, action, ...input }),
      },
    )
    const value: unknown = await response.json()
    if (!response.ok) {
      const error = record(record(value).error)
      throw new HttpError(
        response.status,
        string(error.code),
        string(error.message),
      )
    }
    return value
  }
  const operation = async (action: string, input: Record<string, unknown>) => {
    const result = readHostMessage({
      type: 'reply',
      requestId: 0,
      result: await call(action, input),
    })
    if (result?.type !== 'reply')
      throw new Error('Invalid machine test result.')
    return result.result
  }
  return {
    token: async () => string(await call('token')),
    issue: async (digest: string) => {
      await call('issue', { digest })
    },
    revoke: async () => {
      await call('revoke')
    },
    connection: async () => {
      const result = record(await call('connection'))
      const hello = result.hello === null ? null : record(result.hello)
      return {
        connected: result.connected === true,
        hello: hello && {
          hostProtocolVersion: number(hello.hostProtocolVersion),
          programVersion: string(hello.programVersion),
          at: number(hello.at),
        },
      }
    },
    runCommand: async (command: string, timeoutSeconds: number) => {
      const result = await operation('run', { command, timeoutSeconds })
      if (result.kind !== 'command.result')
        throw new Error('Invalid test command result.')
      return result
    },
    startCommand: async (command: string) => {
      const result = await operation('start', { command })
      if (result.kind !== 'command.started')
        throw new Error('Invalid test command identity.')
      return result
    },
    commandStatus: async (
      processId: number,
      stdoutOffset = 0,
      stderrOffset = 0,
    ) => {
      const result = await operation('status', {
        processId,
        stdoutOffset,
        stderrOffset,
      })
      if (result.kind !== 'command.status')
        throw new Error('Invalid test command status.')
      return result
    },
    fileInfo: async (path: string) => {
      const result = await operation('info', { path })
      if (result.kind !== 'file.info')
        throw new Error('Invalid test file info.')
      return result
    },
    readFile: async (path: string, maxBytes: number) => {
      const result = await operation('read', { path, maxBytes })
      if (result.kind !== 'file.content' && result.kind !== 'file.too_large')
        throw new Error('Invalid test file result.')
      return result
    },
    openStream: async (port: HostStreamPort) => {
      const stream = number(await call('stream.open', { port }))
      return {
        readable: new ReadableStream<Uint8Array>(
          {
            pull: async (controller) => {
              const result = record(await call('stream.read', { stream }))
              if (result.done === true) {
                controller.close()
                return
              }
              if (!Array.isArray(result.value))
                throw new Error('Invalid test stream bytes.')
              controller.enqueue(Uint8Array.from(result.value.map(number)))
            },
            cancel: async () => {
              await call('stream.abort', { stream })
            },
          },
          { highWaterMark: 0 },
        ),
        writable: new WritableStream<Uint8Array>({
          write: async (bytes) => {
            await call('stream.write', { stream, bytes: [...bytes] })
          },
          close: async () => {
            await call('stream.end', { stream })
          },
          abort: async () => {
            await call('stream.abort', { stream })
          },
        }),
      }
    },
  }
}
