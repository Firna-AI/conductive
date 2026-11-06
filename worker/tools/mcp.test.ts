import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TOOL_TURN_HEADER } from '../../tools/context'
import { runToolProcess } from '../../tools/main'
import { MCP_PROTOCOL_VERSION } from '../../tools/mcp'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  inputLines,
  toolFixture,
  toolOutput,
  TOOL_TEST_ENVIRONMENT,
  TOOL_TEST_TURN,
  type ToolFixture,
} from './test-support'

let harness: TestHarness
let fixture: ToolFixture

beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await toolFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

const initialize = JSON.stringify({
  jsonrpc: '2.0',
  id: 'init',
  method: 'initialize',
  params: {
    protocolVersion: '2099-01-01',
    capabilities: {},
    clientInfo: { name: 'test-agent', version: '1' },
  },
})
const initialized = JSON.stringify({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
})
const rpc = (id: number, method: string, params?: unknown) =>
  JSON.stringify({ jsonrpc: '2.0', id, method, params })
const call = (id: number, name: string, args?: unknown) =>
  rpc(id, 'tools/call', { name, arguments: args })

it('serves MCP discovery, create, and list over JSON lines with the calling turn and negotiated version', async () => {
  const output = toolOutput()
  const status = await runToolProcess(
    ['mcp'],
    TOOL_TEST_ENVIRONMENT,
    inputLines([
      initialize,
      initialized,
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'create_workspace' },
      }),
      rpc(1, 'tools/list'),
      call(2, 'create_workspace', {
        repositoryId: 'repo-a',
        firstMessage: 'Delegate this task.',
        model: { agent: 'claude', model: 'mcp-model' },
        effort: 'max',
        sectionId: 'chosen-a',
      }),
      call(3, 'list_workspaces'),
    ]),
    output.output,
    fixture.send,
  )

  expect(status).toBe(0)
  expect(output.stderr).toEqual([])
  expect(output.stdout.map((line): unknown => JSON.parse(line))).toMatchObject([
    {
      id: 'init',
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
      },
    },
    {
      id: 1,
      result: {
        tools: [
          {
            name: 'create_workspace',
            inputSchema: { required: ['repositoryId', 'firstMessage'] },
          },
          { name: 'list_workspaces' },
        ],
      },
    },
    {
      id: 2,
      result: {
        isError: false,
        structuredContent: {
          workspace: {
            orgId: 'org-a',
            sectionId: 'chosen-a',
            choice: { agent: 'claude', model: 'mcp-model', effort: 'max' },
          },
          sessionId: 'created-session',
        },
      },
    },
    {
      id: 3,
      result: {
        isError: false,
        structuredContent: {
          workspaces: [
            { id: 'calling-workspace' },
            { id: 'teammate-workspace' },
            { id: 'archived-workspace' },
          ],
        },
      },
    },
  ])
  expect(fixture.requests).toHaveLength(2)
  for (const request of fixture.requests) {
    expect(request.headers.get(TOOL_TURN_HEADER)).toBe(TOOL_TEST_TURN)
  }
  expect(fixture.services.createWorkspace).toHaveBeenCalledTimes(1)
  expect(fixture.services.createWorkspace).toHaveBeenCalledWith(
    expect.objectContaining({
      firstMessage: 'Delegate this task.',
      sender: expect.objectContaining({ id: 'teammate' }),
    }),
  )
})

it('separates MCP parse, protocol, and tool failures while ignoring notifications', async () => {
  await fixture.db.prepare('UPDATE workspace_tokens SET revoked_at = 1').run()
  const output = toolOutput()
  const status = await runToolProcess(
    ['mcp'],
    TOOL_TEST_ENVIRONMENT,
    inputLines([
      '{',
      rpc(1, 'tools/list'),
      initialize,
      initialized,
      rpc(2, 'unknown-method'),
      call(3, 'unknown-tool'),
      call(4, 'create_workspace', []),
      call(5, 'create_workspace', {}),
      call(6, 'list_workspaces'),
      rpc(7, 'tools/list', 'invalid-params'),
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/cancelled',
        params: { requestId: 6 },
      }),
    ]),
    output.output,
    fixture.send,
  )

  expect(status).toBe(0)
  expect(output.stderr).toEqual([])
  expect(output.stdout.map((line): unknown => JSON.parse(line))).toMatchObject([
    { id: null, error: { code: -32700 } },
    { id: 1, error: { code: -32600 } },
    { id: 'init', result: { protocolVersion: MCP_PROTOCOL_VERSION } },
    { id: 2, error: { code: -32601 } },
    { id: 3, error: { code: -32602 } },
    { id: 4, error: { code: -32602 } },
    {
      id: 5,
      result: {
        isError: true,
        content: [
          { type: 'text', text: 'Complete the required workspace fields.' },
        ],
      },
    },
    {
      id: 6,
      result: {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'The workspace login is not valid. Start the workspace again.',
          },
        ],
      },
    },
    { id: 7, error: { code: -32602 } },
  ])
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})
