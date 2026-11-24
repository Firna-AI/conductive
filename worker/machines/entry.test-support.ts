import { DurableObject } from 'cloudflare:workers'

import { app } from '../app'
import type { AppEnv } from '../env'
import { number, record, string } from '../chat/inputs'
import { errorResponse, HttpError } from '../http'
import { issueMachineToken, machineClient } from './client'
import { machineObjectName, readOwner } from './identity'

export { Workspace } from '../workspace'
export { Machine } from './machine'

interface StreamHandles {
  reader: ReadableStreamDefaultReader<Uint8Array>
  writer: WritableStreamDefaultWriter<Uint8Array>
}
interface ProbeState {
  streams: Map<number, StreamHandles>
  sequence: number
}
interface ProbeEnvironment extends AppEnv {
  MACHINE_PROBES: DurableObjectNamespace<MachineProbe>
}

export class MachineProbe extends DurableObject<AppEnv> {
  private readonly state: ProbeState = { streams: new Map(), sequence: 0 }
  async fetch(request: Request): Promise<Response> {
    try {
      return await control(request, this.env, this.state)
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error)
      return Response.json(
        {
          error: {
            code: 'test_stream_error',
            message:
              error instanceof Error ? error.message : 'Unknown test error.',
          },
        },
        { status: 500 },
      )
    }
  }
}

async function control(
  request: Request,
  env: AppEnv,
  state: ProbeState,
): Promise<Response> {
  const { streams } = state
  const input = record(await request.json())
  const owner = readOwner(input.owner)
  if (!owner) throw new Error('Missing test owner.')
  const client = machineClient(env, owner)
  switch (input.action) {
    case 'token':
      return Response.json(await issueMachineToken(env, owner))
    case 'issue':
      await client.issue(string(input.digest))
      return Response.json(null)
    case 'revoke':
      await client.revoke()
      return Response.json(null)
    case 'connection':
      return Response.json(await client.connection())
    case 'run':
      return Response.json(
        await client.runCommand(
          string(input.command),
          number(input.timeoutSeconds),
        ),
      )
    case 'start':
      return Response.json(await client.startCommand(string(input.command)))
    case 'status':
      return Response.json(
        await client.commandStatus(
          number(input.processId),
          number(input.stdoutOffset),
          number(input.stderrOffset),
        ),
      )
    case 'info':
      return Response.json(await client.fileInfo(string(input.path)))
    case 'read':
      return Response.json(
        await client.readFile(string(input.path), number(input.maxBytes)),
      )
    case 'stream.open': {
      const port = input.port
      if (port !== 7681 && port !== 7682) throw new Error('Invalid test port.')
      const pair = await client.openStream(port)
      const id = ++state.sequence
      streams.set(id, {
        reader: pair.readable.getReader(),
        writer: pair.writable.getWriter(),
      })
      return Response.json(id)
    }
    default: {
      const id = number(input.stream)
      const stream = streams.get(id)
      if (!stream) throw new Error('Missing test stream.')
      if (input.action === 'stream.read') {
        const result = await stream.reader.read()
        return Response.json({
          done: result.done,
          value: result.value ? [...result.value] : null,
        })
      }
      if (input.action === 'stream.write') {
        if (!Array.isArray(input.bytes))
          throw new Error('Invalid test stream bytes.')
        await stream.writer.write(Uint8Array.from(input.bytes.map(number)))
      } else if (input.action === 'stream.end') await stream.writer.close()
      else if (input.action === 'stream.abort') {
        await stream.writer.abort()
        await stream.reader.cancel()
        streams.delete(id)
      } else throw new Error('Unknown machine test control.')
      return Response.json(null)
    }
  }
}

export default {
  async fetch(
    request: Request,
    env: ProbeEnvironment,
    execution: ExecutionContext,
  ): Promise<Response> {
    if (new URL(request.url).pathname !== '/__test/machine')
      return app.fetch(request, env, execution)
    const owner = readOwner(record(await request.clone().json()).owner)
    if (!owner) throw new Error('Missing test owner.')
    return env.MACHINE_PROBES.getByName(machineObjectName(owner)).fetch(request)
  },
}
