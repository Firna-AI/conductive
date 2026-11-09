import { routes } from '../../src/app/router'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { TOOL_ENV, TOOL_TURN_HEADER } from '../../tools/context'
import { runToolProcess } from '../../tools/main'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import {
  inputLines,
  toolFixture,
  toolOutput,
  TOOL_TEST_ENVIRONMENT,
  TOOL_TEST_ORIGIN,
  TOOL_TEST_TOKEN,
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

it('runs CLI create and list through workspace auth and forwards the calling turn', async () => {
  await fixture.db
    .prepare("UPDATE workspaces SET name = '' WHERE id = 'teammate-workspace'")
    .run()
  const output = toolOutput()
  const created = await runToolProcess(
    [
      'workspaces',
      'create',
      '--repository',
      'repo-a',
      '--message',
      '  Build this.\nKeep spacing.  ',
      '--agent',
      'claude',
      '--model',
      'chosen-model',
      '--effort',
      'max',
      '--section',
      'chosen-a',
    ],
    TOOL_TEST_ENVIRONMENT,
    inputLines(),
    output.output,
    fixture.send,
  )
  const listed = await runToolProcess(
    ['workspaces', 'list'],
    TOOL_TEST_ENVIRONMENT,
    inputLines(),
    output.output,
    fixture.send,
  )

  expect([created, listed]).toEqual([0, 0])
  expect(output.stderr).toEqual([])
  expect(output.stdout).toHaveLength(2)
  expect(JSON.parse(output.stdout[0])).toMatchObject({
    workspace: {
      orgId: 'org-a',
      sectionId: 'chosen-a',
      choice: { agent: 'claude', model: 'chosen-model', effort: 'max' },
    },
    sessionId: 'created-session',
  })
  expect(JSON.parse(output.stdout[1])).toEqual({
    workspaces: [
      {
        id: 'calling-workspace',
        number: 1,
        link: `${TEST_ORIGIN}${routes.workspace('org-a', 'calling-workspace')}`,
        name: 'Lisbon',
        branch: 'owner-login/lisbon-ab12',
        state: 'working',
      },
      {
        id: 'teammate-workspace',
        number: 2,
        link: `${TEST_ORIGIN}${routes.workspace('org-a', 'teammate-workspace')}`,
        name: null,
        branch: 'teammate-login/paris-cd34',
        state: 'ready',
      },
      {
        id: 'archived-workspace',
        number: 3,
        link: `${TEST_ORIGIN}${routes.workspace('org-a', 'archived-workspace')}`,
        name: 'Rome',
        branch: 'owner-login/rome-ef56',
        state: 'archived',
      },
    ],
  })
  expect(fixture.requests).toHaveLength(2)
  for (const request of fixture.requests) {
    expect(request.url).toBe(`${TOOL_TEST_ORIGIN}${MACHINE_PATHS.workspaces}`)
    expect(request.headers.get('Authorization')).toBe(
      `Bearer ${TOOL_TEST_TOKEN}`,
    )
    expect(request.headers.get(TOOL_TURN_HEADER)).toBe(TOOL_TEST_TURN)
    expect(request.redirect).toBe('error')
  }
  expect(fixture.services.createWorkspace).toHaveBeenCalledWith(
    expect.objectContaining({
      firstMessage: '  Build this.\nKeep spacing.  ',
      sender: expect.objectContaining({ id: 'teammate' }),
    }),
  )
})

it('rejects incomplete CLI choices and missing runtime login before any request', async () => {
  const invalid = toolOutput()
  const status = await runToolProcess(
    [
      'workspaces',
      'create',
      '--repository',
      'repo-a',
      '--message',
      'Task',
      '--model',
      'orphan-model',
    ],
    TOOL_TEST_ENVIRONMENT,
    inputLines(),
    invalid.output,
    fixture.send,
  )
  expect(status).toBe(1)
  expect(invalid.stdout).toEqual([])
  expect(invalid.stderr).toEqual([
    'Choose Claude or Codex for the workspace.\n',
  ])

  const missing = toolOutput()
  expect(
    await runToolProcess(
      ['workspaces', 'list'],
      { [TOOL_ENV.machineOrigin]: TOOL_TEST_ORIGIN },
      inputLines(),
      missing.output,
      fixture.send,
    ),
  ).toBe(1)
  expect(missing.stderr).toEqual([
    'Start the workspace before you use its tools.\n',
  ])
  expect(fixture.requests).toEqual([])
})
