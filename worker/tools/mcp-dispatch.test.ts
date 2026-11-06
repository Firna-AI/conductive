import { setImmediate } from 'node:timers/promises'

import { expect, it } from 'vitest'

import { runToolProcess } from '../../tools/main'
import { MCP_PROTOCOL_VERSION } from '../../tools/mcp'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpReplies,
  mcpRepliesById,
  mcpRequest,
  mcpToolCall,
} from './mcp-test-support'
import { inputLines, toolOutput, TOOL_TEST_ENVIRONMENT } from './test-support'

it('answers a queued MCP ping while HTTP waits and drains the pending reply at EOF', async () => {
  const output = toolOutput()
  const requests: Request[] = []
  const status = await runToolProcess(
    ['mcp'],
    TOOL_TEST_ENVIRONMENT,
    inputLines([
      MCP_INITIALIZE,
      MCP_INITIALIZED,
      mcpToolCall('list', 'list_workspaces'),
      mcpRequest('ping', 'ping'),
    ]),
    output.output,
    async (request) => {
      requests.push(request)
      // An I/O-turn barrier keeps HTTP pending while queued protocol input runs.
      await setImmediate()
      return Response.json({ workspaces: [] })
    },
  )

  expect(status).toBe(0)
  expect(output.stderr).toEqual([])
  expect(requests).toHaveLength(1)
  expect(mcpReplies(output.stdout).map((reply) => reply.id)).toEqual([
    'init',
    'ping',
    'list',
  ])
  expect(mcpRepliesById(output.stdout)).toMatchObject({
    init: { result: { protocolVersion: MCP_PROTOCOL_VERSION } },
    ping: { result: {} },
    list: { result: { isError: false, structuredContent: { workspaces: [] } } },
  })
})

it('handles a detached reply failure and completes other replies before EOF exit', async () => {
  const output = toolOutput()
  const status = await runToolProcess(
    ['mcp'],
    TOOL_TEST_ENVIRONMENT,
    inputLines([
      MCP_INITIALIZE,
      MCP_INITIALIZED,
      mcpToolCall('list', 'list_workspaces'),
      mcpRequest('ping', 'ping'),
    ]),
    {
      stdout: (line) => {
        if (mcpReplies([line])[0].id === 'list') {
          throw new Error('Private output failure details')
        }
        output.output.stdout(line)
      },
      stderr: output.output.stderr,
    },
    async () => {
      await setImmediate()
      return Response.json({ workspaces: [] })
    },
  )

  expect(status).toBe(1)
  expect(output.stderr).toEqual(['The workspace request failed. Try again.\n'])
  expect(mcpReplies(output.stdout).map((reply) => reply.id)).toEqual([
    'init',
    'ping',
  ])
  expect(mcpRepliesById(output.stdout)).toMatchObject({
    init: { result: { protocolVersion: MCP_PROTOCOL_VERSION } },
    ping: { result: {} },
  })
})
