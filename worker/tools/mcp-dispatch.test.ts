import { setImmediate } from 'node:timers/promises'

import { expect, it } from 'vitest'

import type { DeviceCommandResponse } from '../../src/shared/device'
import { record, text } from '../../tools/input'
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

it.each([
  { state: 'completed', exitCode: 1, timedOut: false },
  { state: 'completed', exitCode: null, timedOut: false },
  { state: 'timed-out', exitCode: 0, timedOut: true },
] as const)(
  'reports Mac $state with exit code $exitCode as failure and preserves the complete result in both adapters',
  async ({ state, exitCode, timedOut }) => {
    const response: DeviceCommandResponse = {
      request: {
        requestId: 'mac-command',
        orgId: 'org',
        workspaceId: 'workspace',
        workspaceName: 'Workspace',
        sessionId: 'session',
        turnId: 'turn',
        sender: {
          id: 'sender',
          githubLogin: 'sender',
          displayName: null,
          avatarUrl: null,
        },
        device: { deviceId: 'mac', connectionId: 'connection' },
        deviceName: 'Sender Mac',
        command: 'make test',
        folder: '/Users/sender/project',
        reason: 'Check the local build',
        timeoutSeconds: 60,
        longerTimeoutReason: null,
        state,
        result: {
          stdout: 'Build output\n',
          stderr: 'Build failed\n',
          exitCode,
          timedOut,
          truncated: true,
        },
        error: null,
        createdAt: 1,
        startedAt: 2,
        updatedAt: 3,
      },
    }
    const { request } = response
    const send = async () => Response.json(response)
    const cli = toolOutput()
    const cliStatus = await runToolProcess(
      [
        'mac',
        'run',
        '--command',
        request.command,
        '--folder',
        request.folder,
        '--reason',
        request.reason,
        '--request-id',
        request.requestId,
      ],
      TOOL_TEST_ENVIRONMENT,
      inputLines(),
      cli.output,
      send,
    )
    const mcp = toolOutput()
    const mcpStatus = await runToolProcess(
      ['mcp'],
      TOOL_TEST_ENVIRONMENT,
      inputLines([
        MCP_INITIALIZE,
        MCP_INITIALIZED,
        mcpToolCall('mac', 'run_mac_command', {
          command: request.command,
          folder: request.folder,
          reason: request.reason,
          requestId: request.requestId,
        }),
      ]),
      mcp.output,
      send,
    )

    expect(cliStatus).toBe(1)
    expect(cli.stderr).toEqual([])
    expect(cli.stdout).toHaveLength(1)
    expect(JSON.parse(cli.stdout[0])).toEqual(response)
    expect(mcpStatus).toBe(0)
    expect(mcp.stderr).toEqual([])
    const result = record(mcpRepliesById(mcp.stdout).mac.result)
    expect(result).toEqual({
      isError: true,
      structuredContent: response,
      content: [{ type: 'text', text: expect.any(String) }],
    })
    const content = result.content
    if (!Array.isArray(content))
      throw new Error('The MCP result has no content.')
    expect(JSON.parse(text(record(content[0]).text))).toEqual(response)
  },
)
