import { afterEach, beforeEach, expect, it } from 'vitest'

import { TOOL_ENV } from '../../tools/context'
import { runToolProcess } from '../../tools/main'
import { sessionPaths } from '../../src/shared/sessions'
import { inputLines, toolOutput } from '../tools/test-support'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpToolCall,
  mcpRepliesById,
} from '../tools/mcp-test-support'
import {
  deviceFixture,
  MACHINE,
  TOKEN,
  WID,
  type DeviceFixture,
} from './runtime.test-support'
import { connected, ref, result, sendFrame } from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it.each(['cli', 'mcp'] as const)(
  'runs the %s Mac tool through the real Worker and active stored turn',
  async (mode) => {
    const mac = await connected(fixture)
    const output = toolOutput()
    const input = fixture.input(mode === 'cli' ? '.' : '..')
    const task = runToolProcess(
      mode === 'cli'
        ? [
            'mac',
            'run',
            '--command',
            input.command,
            '--folder',
            input.folder,
            '--reason',
            input.reason,
            '--request-id',
            input.requestId,
          ]
        : ['mcp'],
      {
        [TOOL_ENV.machineOrigin]: MACHINE,
        [TOOL_ENV.workspaceToken]: TOKEN,
        [TOOL_ENV.turnId]: fixture.turnId,
      },
      mode === 'cli'
        ? inputLines()
        : inputLines([
            MCP_INITIALIZE,
            MCP_INITIALIZED,
            mcpToolCall('mac', 'run_mac_command', input),
          ]),
      output.output,
      async (request) => {
        const response = await fixture.runtime.dispatchFetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers),
          ...(request.method !== 'GET' && { body: await request.text() }),
        })
        return new Response(await response.text(), {
          status: response.status,
          headers: Object.fromEntries(response.headers),
        })
      },
    )
    expect(await mac.inbox.next()).toMatchObject({
      type: 'command.request',
      request: {
        workspaceId: WID,
        sender: { id: 'sender' },
        command: input.command,
      },
    })
    await sendFrame(mac, { type: 'command.approved', ...ref(input.requestId) })
    await sendFrame(mac, {
      type: 'command.result',
      ...ref(input.requestId),
      result,
    })
    expect(await task).toBe(0)
    expect(output.stderr).toEqual([])
    const expected = { request: { state: 'completed', result } }
    if (mode === 'cli')
      expect(JSON.parse(output.stdout[0])).toMatchObject(expected)
    else
      expect(mcpRepliesById(output.stdout)).toMatchObject({
        mac: { result: { isError: false, structuredContent: expected } },
      })
  },
)

it.each(['cli', 'mcp'] as const)(
  'ends %s Mac command polling with a clear failure after Stop',
  async (mode) => {
    const mac = await connected(fixture)
    const output = toolOutput()
    const input = fixture.input()
    const methods: string[] = []
    let releaseRead: () => void = () => {
      throw new Error('Missing stopped turn barrier.')
    }
    const turnStopped = new Promise<void>((resolve) => {
      releaseRead = resolve
    })
    const task = runToolProcess(
      mode === 'cli'
        ? [
            'mac',
            'run',
            '--command',
            input.command,
            '--folder',
            input.folder,
            '--reason',
            input.reason,
            '--request-id',
            input.requestId,
          ]
        : ['mcp'],
      {
        [TOOL_ENV.machineOrigin]: MACHINE,
        [TOOL_ENV.workspaceToken]: TOKEN,
        [TOOL_ENV.turnId]: fixture.turnId,
      },
      mode === 'cli'
        ? inputLines()
        : inputLines([
            MCP_INITIALIZE,
            MCP_INITIALIZED,
            mcpToolCall('mac', 'run_mac_command', input),
          ]),
      output.output,
      async (request) => {
        methods.push(request.method)
        if (request.method === 'GET') await turnStopped
        const response = await fixture.runtime.dispatchFetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers),
          ...(request.method !== 'GET' && { body: await request.text() }),
        })
        return new Response(await response.text(), {
          status: response.status,
          headers: Object.fromEntries(response.headers),
        })
      },
    )
    expect(await mac.inbox.next()).toMatchObject({
      type: 'command.request',
      request: { requestId: input.requestId },
    })
    await sendFrame(mac, { type: 'command.approved', ...ref(input.requestId) })
    const stopped = await fixture.app(
      sessionPaths.interrupt('org', WID, fixture.sessionId),
      { turnId: fixture.turnId },
    )
    expect(stopped.status).toBe(200)
    expect(await mac.inbox.next()).toEqual({
      type: 'command.cancel',
      ...ref(input.requestId),
    })
    releaseRead()
    expect(await task).toBe(mode === 'cli' ? 1 : 0)
    expect(methods).toEqual(['POST', 'GET'])
    const message =
      'calling_turn_required: Start this request from an active agent turn. The agent turn ended. The tool cannot read the Mac command result.'
    if (mode === 'cli') {
      expect(output.stdout).toEqual([])
      expect(output.stderr).toEqual([`${message}\n`])
    } else {
      expect(output.stderr).toEqual([])
      expect(mcpRepliesById(output.stdout).mac).toEqual({
        jsonrpc: '2.0',
        id: 'mac',
        result: {
          content: [{ type: 'text', text: message }],
          isError: true,
        },
      })
    }
  },
)
