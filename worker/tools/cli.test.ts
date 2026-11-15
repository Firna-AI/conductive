import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { routes } from '../../src/app/router'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { sessionLink } from '../../src/shared/session-link'
import { TOOL_ENV, TOOL_TURN_HEADER } from '../../tools/context'
import { runToolProcess } from '../../tools/main'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { publishToolImage, TOOL_MODELS } from './list-test-support'
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
  await publishToolImage(fixture.db)
  fixture.services.models.mockResolvedValue(TOOL_MODELS)
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
      '--name',
      'CLI workspace',
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
  const lists: number[] = []
  for (const resource of ['repositories', 'sections', 'models']) {
    lists.push(
      await runToolProcess(
        [resource, 'list'],
        TOOL_TEST_ENVIRONMENT,
        inputLines(),
        output.output,
        fixture.send,
      ),
    )
  }

  expect([created, listed, ...lists]).toEqual([0, 0, 0, 0, 0])
  expect(output.stderr).toEqual([])
  expect(output.stdout).toHaveLength(5)
  expect(JSON.parse(output.stdout[0])).toMatchObject({
    workspace: {
      orgId: 'org-a',
      sectionId: 'chosen-a',
      choice: {
        agent: 'claude',
        model: 'chosen-model',
        effort: 'max',
        fast: false,
      },
    },
    sessionId: 'created-session',
  })
  expect(JSON.parse(output.stdout[1])).toEqual({
    workspaces: [
      {
        owner: { id: 'owner', githubLogin: 'owner-login', displayName: null },
        id: 'calling-workspace',
        number: 1,
        link: `${TEST_ORIGIN}${routes.workspace('org-a', 'calling-workspace')}`,
        name: 'Lisbon',
        branch: 'owner-login/lisbon-ab12',
        state: 'working',
      },
      {
        owner: {
          id: 'teammate',
          githubLogin: 'teammate-login',
          displayName: null,
        },
        id: 'teammate-workspace',
        number: 2,
        link: `${TEST_ORIGIN}${routes.workspace('org-a', 'teammate-workspace')}`,
        name: null,
        branch: 'teammate-login/paris-cd34',
        state: 'ready',
      },
      {
        owner: { id: 'owner', githubLogin: 'owner-login', displayName: null },
        id: 'archived-workspace',
        number: 3,
        link: `${TEST_ORIGIN}${routes.workspace('org-a', 'archived-workspace')}`,
        name: 'Rome',
        branch: 'owner-login/rome-ef56',
        state: 'archived',
      },
    ],
  })
  expect(output.stdout.slice(2).map((line) => JSON.parse(line))).toEqual([
    {
      repositories: [
        {
          id: 'repo-a',
          fullName: 'example/alpha',
          defaultBranch: 'main',
          current: true,
        },
      ],
    },
    {
      sections: [
        { id: 'general-a', name: 'General', default: true },
        { id: 'chosen-a', name: 'Chosen', default: false },
      ],
    },
    {
      models: TOOL_MODELS,
      defaultChoice: {
        agent: 'codex',
        model: 'owner-default-model',
        effort: 'high',
        fast: false,
      },
    },
  ])
  expect(fixture.requests.map((request) => request.url)).toEqual(
    [
      MACHINE_PATHS.workspaces,
      MACHINE_PATHS.workspaces,
      MACHINE_PATHS.repositories,
      MACHINE_PATHS.sections,
      MACHINE_PATHS.models,
    ].map((path) => `${TOOL_TEST_ORIGIN}${path}`),
  )
  for (const request of fixture.requests) {
    expect(request.headers.get('Authorization')).toBe(
      `Bearer ${TOOL_TEST_TOKEN}`,
    )
    expect(request.headers.get(TOOL_TURN_HEADER)).toBe(TOOL_TEST_TURN)
    expect(request.redirect).toBe('error')
  }
  expect(fixture.services.createWorkspace).toHaveBeenCalledWith(
    expect.objectContaining({
      firstMessage: `  Build this.\nKeep spacing.  \n\n---\nSent by: ${sessionLink(harness.env.APP_ORIGIN, 'org-a', 'calling-workspace', 'calling-session')}`,
      name: 'CLI workspace',
      sender: expect.objectContaining({ id: 'teammate' }),
    }),
  )
})

it('rejects incomplete CLI choices and missing runtime login before any request', async () => {
  const help = toolOutput()
  expect(
    await runToolProcess(
      ['sessions', 'send', '--help'],
      {},
      inputLines(),
      help.output,
      fixture.send,
    ),
  ).toBe(0)
  expect(help.stderr).toEqual([])
  expect(help.stdout[0]).toContain('conductive sessions send')
  expect(fixture.requests).toEqual([])
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
