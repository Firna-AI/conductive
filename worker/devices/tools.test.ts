import { afterEach, beforeEach, expect, it } from 'vitest'

import { TOOL_ENV } from '../../tools/context'
import { runToolProcess } from '../../tools/main'
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
