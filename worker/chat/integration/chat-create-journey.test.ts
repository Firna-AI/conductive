import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../../src/shared/account'
import { MODELS_PATH } from '../../../src/shared/agents'
import { chatHistoryPath } from '../../../src/shared/events'
import { GET_STARTED_PATH } from '../../../src/shared/onboarding'
import { sessionPaths } from '../../../src/shared/sessions'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
} from '../../../src/shared/workspaces'
import { readCreated } from '../../../src/app/api/read-workspaces'
import { readWorkspaceToken } from '../../lifecycle/tokens'
import { readWorkspace } from '../../lifecycle/workspace-data'
import { sandboxProvider } from '../../sandbox/client'
import type { Workspace } from './journey-entry.test-support'
import { closeSockets } from '../adapter-sockets.test-support'
import { CLAUDE } from '../harness.test-support'
import { record, string } from '../inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_REPOSITORY } from './outer-seed.test-support'
import { connectShellRunner } from './shell-runner.test-support'
import { driveWorkspaceStart } from './workspace-start.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/journey-entry.test-support.ts',
  )
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
  fixture = undefined
})

it('boots the production shell and delivers the durable first message through stop and resume', async () => {
  const active = (fixture = await createOuterRuntime(bundle, {
    configuration: {
      CONDUCTIVE_MODELS: JSON.stringify([
        { ...CLAUDE, label: 'Operator model', efforts: ['high'] },
      ]),
      CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify(CLAUDE),
      CONDUCTIVE_COMPUTER_MCP_URL: 'https://computer.conductive.test/mcp',
    },
  }))
  await active.env.DB.prepare(
    `INSERT INTO github_installations (id, account_login, account_type, created_at)
     VALUES (91, 'owner', 'User', 1)`,
  ).run()
  for (const path of [ACCOUNT_PATHS.account, MODELS_PATH, GET_STARTED_PATH])
    expect((await active.request(path)).status).toBe(200)
  expect(await (await active.request(GET_STARTED_PATH)).json()).toEqual({
    orgId: OUTER_ORG,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: true },
      { step: 'agent-login', complete: true },
    ],
  })
  const input = {
    repositoryId: OUTER_REPOSITORY,
    firstMessage: {
      id: 'http-first-message',
      text: 'Keep the first request',
      choice: CLAUDE,
      attachmentIds: [],
    },
  }
  const create = () =>
    active.request(workspacesPath(OUTER_ORG), {
      method: 'POST',
      headers: { Cookie: active.cookies.memberCookie },
      body: JSON.stringify(input),
    })
  const response = await create()
  expect(response.status).toBe(201)
  const created = readCreated(await response.json())
  expect(created.firstMessage).toMatchObject({
    id: input.firstMessage.id,
    state: 'queued',
    sender: { id: 'member' },
  })
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = () => bindings.WORKSPACES.getByName(created.workspace.id)
  expect(
    await driveWorkspaceStart<
      Awaited<ReturnType<Workspace['waitCreationLifecycle']>>
    >(actor(), actor().waitCreationLifecycle()),
  ).toEqual({ ok: true })
  const repeated = await create()
  expect(repeated.status).toBe(201)
  const duplicate = readCreated(await repeated.json())
  expect(duplicate.workspace.id).toBe(created.workspace.id)
  expect(duplicate.firstMessage).toEqual(created.firstMessage)
  const token = await readWorkspaceToken(active.env, created.workspace.id)
  const runner = await connectShellRunner(
    active,
    created.workspace.id,
    token,
    'http-create-stream',
  )
  sockets.push(runner.socket)
  expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
  runner.emit({ type: 'runner.ready' })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  const command = record(await runner.inbox.next())
  const turnId = string(command.turnId)
  expect(command).toMatchObject({
    type: 'turn',
    sessionId: created.sessionId,
    message: {
      id: 'http-first-message',
      text: 'Keep the first request',
      sender: { id: 'member' },
    },
    login: { secret: 'outer-secret-member' },
  })
  runner.emit({
    type: 'assistant.delta',
    sessionId: created.sessionId,
    turnId,
    messageId: 'http-answer',
    text: 'Before stop',
  })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  const stopped = await active.request(
    sessionPaths.interrupt(OUTER_ORG, created.workspace.id, created.sessionId),
    {
      method: 'POST',
      body: JSON.stringify({ turnId }),
    },
  )
  expect(stopped.status).toBe(200)
  expect(await runner.inbox.next()).toMatchObject({ type: 'interrupt', turnId })
  runner.emit({
    type: 'turn.completed',
    sessionId: created.sessionId,
    turnId,
    state: 'stopped',
    durationMs: 10,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['http-first-message'],
  })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 3,
  })
  const running = await readWorkspace(
    active.env.DB,
    OUTER_ORG,
    created.workspace.id,
  )
  if (!running.sandboxId) throw new Error('The sandbox ID is missing.')
  expect(
    await sandboxProvider(active.env, active.boat.fetch).stop(
      running.sandboxId,
    ),
  ).toMatchObject({ state: 'archived' })
  await actor().lifecycleStopped()
  expect(await runner.closed).toEqual({
    code: 1000,
    reason: 'Connection closed.',
  })
  const detailPath = workspacePath(OUTER_ORG, created.workspace.id)
  expect(await (await active.request(detailPath)).json()).toMatchObject({
    workspace: { state: 'stopped' },
  })
  const resumed = await driveWorkspaceStart(
    actor(),
    active.request(workspacePaths.resume(OUTER_ORG, created.workspace.id), {
      method: 'POST',
      body: '{}',
    }),
  )
  expect(resumed.status).toBe(200)
  expect(active.boat.resumeIds).toHaveLength(1)
  expect(
    (
      await active.request(
        workspacePaths.activity(OUTER_ORG, created.workspace.id),
        {
          method: 'POST',
          body: JSON.stringify({ source: 'input' }),
        },
      )
    ).status,
  ).toBe(200)
  const again = await connectShellRunner(
    active,
    created.workspace.id,
    token,
    'http-resume-stream',
  )
  sockets.push(again.socket)
  expect(await again.inbox.next()).toMatchObject({ type: 'welcome' })
  again.emit({ type: 'runner.ready' })
  expect(await again.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  const sent = await active.request(
    sessionPaths.messages(OUTER_ORG, created.workspace.id, created.sessionId),
    {
      method: 'POST',
      headers: { Cookie: active.cookies.memberCookie },
      body: JSON.stringify({
        id: 'http-second-message',
        text: 'Continue after resume',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(sent.status).toBe(202)
  expect(await again.inbox.next()).toMatchObject({
    type: 'turn',
    message: { id: 'http-second-message' },
    login: { secret: 'outer-secret-member' },
  })
  const history = await active.request(
    chatHistoryPath(OUTER_ORG, created.workspace.id, created.sessionId),
  )
  expect(history.status).toBe(200)
  const body: unknown = await history.json()
  expect(body).toMatchObject({
    events: expect.arrayContaining([
      expect.objectContaining({
        event: expect.objectContaining({
          type: 'assistant.delta',
          text: 'Before stop',
        }),
      }),
      expect.objectContaining({
        event: expect.objectContaining({
          type: 'message.accepted',
          message: expect.objectContaining({ id: 'http-second-message' }),
        }),
      }),
    ]),
  })
  expect(JSON.stringify(body)).not.toContain('outer-secret-member')
})
