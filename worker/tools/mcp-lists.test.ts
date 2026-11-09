import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { TOOL_ENV } from '../../tools/context'
import { runToolProcess } from '../../tools/main'
import { createHarness, type TestHarness } from '../test-support/harness'
import { publishToolImage, TOOL_MODELS } from './list-test-support'
import {
  MCP_INITIALIZE as initialize,
  MCP_INITIALIZED as initialized,
  mcpRepliesById,
  mcpRequest as rpc,
  mcpToolCall as call,
} from './mcp-test-support'
import {
  inputLines,
  OWNER_CHOICE,
  toolFixture,
  toolOutput,
  TOOL_TEST_ORIGIN,
  TOOL_TEST_TOKEN,
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

it('discovers and calls repository, section, and model MCP lists without an active turn', async () => {
  await publishToolImage(fixture.db)
  fixture.services.models.mockResolvedValue(TOOL_MODELS)
  const output = toolOutput()
  const status = await runToolProcess(
    ['mcp'],
    {
      [TOOL_ENV.machineOrigin]: TOOL_TEST_ORIGIN,
      [TOOL_ENV.workspaceToken]: TOOL_TEST_TOKEN,
    },
    inputLines([
      initialize,
      initialized,
      rpc(1, 'tools/list'),
      call(2, 'list_repositories'),
      call(3, 'list_sections'),
      call(4, 'list_models'),
    ]),
    output.output,
    fixture.send,
  )
  expect(status).toBe(0)
  expect(output.stderr).toEqual([])
  expect(output.stdout).toHaveLength(5)
  expect(mcpRepliesById(output.stdout)).toMatchObject({
    1: {
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: 'create_workspace',
            inputSchema: {
              type: 'object',
              required: ['repositoryId', 'firstMessage'],
              properties: expect.objectContaining({
                name: {
                  type: 'string',
                  description: expect.stringContaining('60'),
                },
                repositoryId: expect.objectContaining({
                  description: expect.stringContaining('list_repositories'),
                }),
                sectionId: expect.objectContaining({
                  description: expect.stringContaining('list_sections'),
                }),
                effort: expect.objectContaining({
                  description: expect.stringContaining('list_models'),
                }),
                model: expect.objectContaining({
                  properties: {
                    agent: expect.objectContaining({
                      description: expect.stringContaining('list_models'),
                    }),
                    model: expect.objectContaining({
                      description: expect.stringContaining('list_models'),
                    }),
                  },
                }),
              }),
            },
          }),
          ...['list_repositories', 'list_sections', 'list_models'].map((name) =>
            expect.objectContaining({
              name,
              inputSchema: { type: 'object', properties: {} },
              annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
              },
            }),
          ),
        ]),
      },
    },
    2: {
      result: {
        isError: false,
        structuredContent: {
          repositories: [
            {
              id: 'repo-a',
              fullName: 'example/alpha',
              defaultBranch: 'main',
              current: true,
            },
          ],
        },
      },
    },
    3: {
      result: {
        isError: false,
        structuredContent: {
          sections: [
            { id: 'general-a', name: 'General', default: true },
            { id: 'chosen-a', name: 'Chosen', default: false },
          ],
        },
      },
    },
    4: {
      result: {
        isError: false,
        structuredContent: { models: TOOL_MODELS, defaultChoice: OWNER_CHOICE },
      },
    },
  })
  expect(fixture.requests.map((request) => request.url)).toEqual(
    [
      MACHINE_PATHS.repositories,
      MACHINE_PATHS.sections,
      MACHINE_PATHS.models,
    ].map((path) => `${TOOL_TEST_ORIGIN}${path}`),
  )
  for (const request of fixture.requests) {
    expect(request.headers.get('Authorization')).toBe(
      `Bearer ${TOOL_TEST_TOKEN}`,
    )
  }
  expect(fixture.services.callingTurn).not.toHaveBeenCalled()
})
