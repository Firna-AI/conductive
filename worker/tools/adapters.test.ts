import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { runToolProcess } from '../../tools/main'
import { TOOL_ENV, TOOL_TURN_HEADER } from '../../tools/context'
import { record } from '../../tools/input'
import { createHarness, type TestHarness } from '../test-support/harness'
import { ADAPTER_CASES } from './adapter-cases.test-support'
import { adapterFixture } from './adapter-test-support'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpRepliesById,
  mcpRequest,
  mcpToolCall,
} from './mcp-test-support'
import {
  inputLines,
  TOOL_TEST_ENVIRONMENT,
  TOOL_TEST_TOKEN,
  TOOL_TEST_TURN,
  toolOutput,
} from './test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('routes CLI management calls and list/create options through the handler', async () => {
  const fixture = await adapterFixture(harness)
  for (const item of ADAPTER_CASES) {
    const output = toolOutput()
    const status = await runToolProcess(
      item.cli,
      environment(item),
      inputLines(),
      output.output,
      fixture.send,
    )
    expect({ status, stderr: output.stderr }, item.name).toEqual({
      status: 0,
      stderr: [],
    })
    const value: unknown = JSON.parse(output.stdout.join(''))
    expect(value, item.name).toMatchObject(item.reply)
    await checkRequest(fixture.requests.at(-1), item)
  }
})

it('discovers and routes MCP management calls and options through the handler', async () => {
  const fixture = await adapterFixture(harness)
  const output = toolOutput()
  expect(
    await runToolProcess(
      ['mcp'],
      TOOL_TEST_ENVIRONMENT,
      inputLines([
        MCP_INITIALIZE,
        MCP_INITIALIZED,
        mcpRequest('tools', 'tools/list'),
      ]),
      output.output,
      fixture.send,
    ),
  ).toBe(0)
  const discovery = record(record(mcpRepliesById(output.stdout).tools).result)
  expect(discovery.tools).toHaveLength(24)
  for (const item of ADAPTER_CASES) {
    const call = toolOutput()
    expect(
      await runToolProcess(
        ['mcp'],
        environment(item),
        inputLines([
          MCP_INITIALIZE,
          MCP_INITIALIZED,
          mcpToolCall('call', item.name, item.args),
        ]),
        call.output,
        fixture.send,
      ),
    ).toBe(0)
    const result = record(record(mcpRepliesById(call.stdout).call).result)
    expect(result, item.name).toMatchObject({
      isError: false,
      structuredContent: item.reply,
    })
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(result.structuredContent) },
    ])
    await checkRequest(fixture.requests.at(-1), item)
  }
})

async function checkRequest(
  request: Request | undefined,
  item: (typeof ADAPTER_CASES)[number],
) {
  expect(request, item.name).toBeInstanceOf(Request)
  if (!request) throw new Error('Missing adapter request')
  const url = new URL(request.url)
  expect(url.pathname, item.name).toBe(item.path)
  expect(Object.fromEntries(url.searchParams), item.name).toEqual(
    item.query ?? {},
  )
  expect(request.method, item.name).toBe(
    item.body === undefined ? 'GET' : 'POST',
  )
  expect(request.headers.get('Authorization')).toBe(`Bearer ${TOOL_TEST_TOKEN}`)
  expect(request.headers.get(TOOL_TURN_HEADER)).toBe(
    item.body === undefined ? null : TOOL_TEST_TURN,
  )
  expect(request.redirect).toBe('error')
  const raw = await request.text()
  const body: unknown = raw === '' ? undefined : JSON.parse(raw)
  expect(body, item.name).toEqual(item.body)
}

function environment(item: (typeof ADAPTER_CASES)[number]) {
  return {
    ...TOOL_TEST_ENVIRONMENT,
    ...(item.body === undefined && { [TOOL_ENV.turnId]: undefined }),
  }
}
