import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TOOL_TURN_HEADER } from '../../tools/context'
import { HttpError } from '../http'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  OWNER_CHOICE,
  toolFixture,
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

it('inherits the org, owner, and owner defaults while the calling sender starts the first message', async () => {
  const response = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: '  Keep this text.\nThen continue.  ',
    orgId: 'org-b',
    ownerUserId: 'outsider',
  })

  expect(response.status).toBe(201)
  expect(fixture.services.callingTurn).toHaveBeenCalledWith(
    'calling-workspace',
    TOOL_TEST_TURN,
  )
  expect(fixture.services.createWorkspace).toHaveBeenCalledExactlyOnceWith({
    orgId: 'org-a',
    owner: {
      id: 'owner',
      githubLogin: 'owner-login',
      displayName: null,
      avatarUrl: null,
    },
    repositoryId: 'repo-a',
    sectionId: 'general-a',
    choice: OWNER_CHOICE,
    firstMessage: '  Keep this text.\nThen continue.  ',
    sender: {
      id: 'teammate',
      githubLogin: 'teammate-login',
      displayName: null,
      avatarUrl: null,
    },
    createdByWorkspaceId: 'calling-workspace',
  })
  expect(await response.json()).toMatchObject({
    workspace: { orgId: 'org-a', owner: { id: 'owner' }, choice: OWNER_CHOICE },
    sessionId: 'created-session',
  })
})

it('uses the chosen model, effort, and org section without looking up unresolved defaults', async () => {
  await fixture.db.prepare('DELETE FROM user_preferences').run()
  fixture.services.ownerDefaultChoice.mockRejectedValue(
    new Error('Defaults must not be read'),
  )
  const response = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Build the feature.',
    model: { agent: 'claude', model: 'chosen-model' },
    effort: 'max',
    sectionId: 'chosen-a',
  })

  expect(response.status).toBe(201)
  expect(fixture.services.createWorkspace).toHaveBeenCalledWith(
    expect.objectContaining({
      sectionId: 'chosen-a',
      choice: { agent: 'claude', model: 'chosen-model', effort: 'max' },
    }),
  )
  expect(fixture.services.ownerDefaultChoice).not.toHaveBeenCalled()
})

it('blocks repositories and sections outside the calling org', async () => {
  for (const [input, code] of [
    [{ repositoryId: 'repo-b', firstMessage: 'Task' }, 'repository_not_found'],
    [
      { repositoryId: 'repo-a', firstMessage: 'Task', sectionId: 'general-b' },
      'section_not_found',
    ],
  ] as const) {
    const response = await fixture.create(input)
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code } })
  }
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})

it('rejects absent or stale turn context, mismatched workspaces, and senders outside the org', async () => {
  const missing = await fixture.create(
    { repositoryId: 'repo-a', firstMessage: 'Task' },
    { [TOOL_TURN_HEADER]: '' },
  )
  expect(missing.status).toBe(403)
  for (const turn of [
    null,
    {
      workspaceId: 'outside-workspace',
      turnId: TOOL_TEST_TURN,
      senderUserId: 'teammate',
    },
    {
      workspaceId: 'calling-workspace',
      turnId: 'old-turn',
      senderUserId: 'teammate',
    },
    {
      workspaceId: 'calling-workspace',
      turnId: TOOL_TEST_TURN,
      senderUserId: 'outsider',
    },
  ]) {
    fixture.services.callingTurn.mockResolvedValue(turn)
    const response = await fixture.create({
      repositoryId: 'repo-a',
      firstMessage: 'Task',
    })
    expect(response.status, JSON.stringify(turn)).toBe(403)
  }
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})

it('uses the account default policy when needed and exposes unresolved defaults without inventing a model', async () => {
  await fixture.db.prepare('DELETE FROM user_preferences').run()
  const unavailable = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task',
  })
  expect(unavailable.status).toBe(503)
  expect(await unavailable.json()).toMatchObject({
    error: { code: 'owner_defaults_unavailable' },
  })
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()

  fixture.services.ownerDefaultChoice.mockResolvedValue({
    agent: 'claude',
    model: 'account-default',
    effort: 'medium',
  })
  const fromPolicy = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task',
    effort: 'low',
  })
  expect(fromPolicy.status).toBe(201)
  expect(fixture.services.ownerDefaultChoice).toHaveBeenCalledWith('owner')
  expect(fixture.services.createWorkspace).toHaveBeenLastCalledWith(
    expect.objectContaining({
      choice: { agent: 'claude', model: 'account-default', effort: 'low' },
    }),
  )
})

it('reports a lifecycle start failure instead of a successful create', async () => {
  fixture.services.createWorkspace.mockRejectedValue(
    new HttpError(
      503,
      'sandbox_start_failed',
      'The cloud computer could not start. Try again.',
    ),
  )
  const response = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task',
  })
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({
    error: {
      code: 'sandbox_start_failed',
      message: 'The cloud computer could not start. Try again.',
    },
  })
})
