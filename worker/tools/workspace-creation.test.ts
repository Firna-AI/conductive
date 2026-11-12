import { afterEach, beforeAll, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { agentWorkspacePaths } from '../../src/shared/agent-workspaces'
import { sessionPath } from '../../src/shared/sessions'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
} from '../chat/integration/outer-seed.test-support'
import { driveWorkspaceStart } from '../chat/integration/workspace-start.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import { chatKey } from '../chat/storage-keys'
import { featureState } from '../features/fixture.test-support'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'
import {
  admittedToolWorkspace,
  completeToolCreation,
  creationActor,
} from './workspace-creation.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('keeps one titled admission for overlapping creates and a lost reply after restart or changed defaults', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const input = {
    repositoryId: OUTER_REPOSITORY,
    firstMessage: 'Delegate this task',
    name: 'First workspace',
    firstSessionTitle:
      '\n  Fix_my   first session. An_extraordinarily_long_unbroken_word_that_does_not_fit_the_title_limit\nOther text',
    requestId: 'same-create',
  }
  const first = active.post(MACHINE_PATHS.workspaces, input)
  const overlapping = active.post(MACHINE_PATHS.workspaces, input)
  const id = await admittedToolWorkspace(active)
  await completeToolCreation(active, id)
  expect((await first).status).toBe(201)
  const response = await overlapping
  expect(response.status).toBe(201)
  const accepted = record(await response.json())
  expect(record(accepted.workspace)).toMatchObject({
    id,
    number: 3,
    name: 'First workspace',
    owner: { id: 'owner' },
    choice: CLAUDE,
  })
  const sessionId = string(accepted.sessionId)
  const actor = await creationActor(active, id)
  let state = featureState(await actor.inspectFeatureState())
  expect(record(state.get(chatKey('session', sessionId))).title).toBe(
    'Fix_my first session.',
  )
  const messagePrefix = chatKey('message', '')
  const messages = [...state.entries()].filter(([key]) =>
    key.startsWith(messagePrefix),
  )
  expect(messages).toHaveLength(1)
  const originalMessage = messages[0]
  const renamed = await active.post(agentWorkspacePaths.rename(id), {
    name: 'Renamed workspace',
  })
  expect(renamed.status).toBe(200)
  const renamedSession = await active.request(
    sessionPath(OUTER_ORG, id, sessionId),
    {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Member session title' }),
    },
  )
  expect(renamedSession.status).toBe(200)
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO user_preferences (user_id, default_agent, default_model, default_effort, updated_at) VALUES ('owner', 'codex', '', 'max', 2)",
    ),
    active.env.DB.prepare(
      "UPDATE org_images SET image_name = NULL WHERE org_id = 'chat-org'",
    ),
    active.env.DB.prepare("DELETE FROM agent_logins WHERE user_id = 'member'"),
  ])
  await active.restart()
  const repeated = await active.post(MACHINE_PATHS.workspaces, input)
  expect(repeated.status).toBe(201)
  const replayed = record(await repeated.json())
  expect(replayed).toMatchObject({
    sessionId,
    sessionLink: accepted.sessionLink,
    workspace: { id, number: 3, name: 'Renamed workspace', choice: CLAUDE },
  })
  state = featureState(
    await (await creationActor(active, id)).inspectFeatureState(),
  )
  expect(record(state.get(chatKey('session', sessionId))).title).toBe(
    'Member session title',
  )
  expect(
    [...state.entries()].filter(([key]) => key.startsWith(messagePrefix)),
  ).toEqual([originalMessage])
  expect(
    await active.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces WHERE created_by_workspace_id IS NOT NULL',
    ).first('count'),
  ).toBe(1)
  expect(active.boat.starts).toHaveLength(1)
})

it('replays the same failed first start without new workspace session message or provider allocation', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  active.boat.commandExitCode = 1
  const input = {
    repositoryId: OUTER_REPOSITORY,
    firstMessage: 'Keep the failed task',
    firstSessionTitle: 'Keep the failed session',
    requestId: 'failed-create',
  }
  const pending = active.post(MACHINE_PATHS.workspaces, input)
  const id = await admittedToolWorkspace(active)
  const actor = await creationActor(active, id)
  const failed = await driveWorkspaceStart(actor, pending)
  expect(failed.status).toBe(502)
  expect(await failed.json()).toMatchObject({
    error: { code: 'workspace_start_failed' },
  })
  const original = await active.env.DB.prepare(
    'SELECT session_id AS sessionId, first_turn_id AS turnId, first_message_id AS messageId FROM workspace_runtime WHERE workspace_id = ?',
  )
    .bind(id)
    .first<{ sessionId: string; turnId: string; messageId: string }>()
  if (!original) throw new Error('The failed create lost its runtime record.')
  expect((await actor.readLifecycle())?.state).toBe('error')
  const renamed = await active.post(agentWorkspacePaths.rename(id), {
    name: 'Kept failed workspace',
  })
  expect(renamed.status).toBe(200)
  await active.env.DB.prepare(
    "DELETE FROM agent_logins WHERE user_id = 'member'",
  ).run()
  await active.restart()
  const repeated = await active.post(MACHINE_PATHS.workspaces, input)
  expect(repeated.status).toBe(502)
  expect(await repeated.json()).toMatchObject({
    error: { code: 'workspace_start_failed' },
  })
  expect(
    await active.env.DB.prepare(
      'SELECT session_id AS sessionId, first_turn_id AS turnId, first_message_id AS messageId FROM workspace_runtime WHERE workspace_id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual(original)
  expect(
    await active.env.DB.prepare(
      'SELECT name, state FROM workspaces WHERE id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ name: 'Kept failed workspace', state: 'error' })
  expect(
    await active.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(3)
  const state = featureState(
    await (await creationActor(active, id)).inspectFeatureState(),
  )
  expect(record(state.get(chatKey('session', original.sessionId))).title).toBe(
    'Keep the failed session',
  )
  expect(
    [...state.keys()].filter((key) => key.startsWith(chatKey('message', ''))),
  ).toEqual([chatKey('message', original.messageId)])
  expect(active.boat.starts).toHaveLength(1)
})
