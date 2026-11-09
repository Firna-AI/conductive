import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePath, workspacesPath } from '../../../src/shared/workspaces'
import { sessionPaths } from '../../../src/shared/sessions'
import { record } from '../inputs'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import type { Workspace } from './workspace-title-entry.test-support'
import {
  recoveryWorkspaceFixture,
  type RecoveryWorkspaceFixture,
} from './workspace-recovery.test-support'

let bundle: string
let fixture: RecoveryWorkspaceFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/workspace-title-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('names the workspace and first session from the first message and sends the title to both tabs', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  const before = (await actor.readChatWorkspaceSummary()).throughEventNumber
  const ownerTab = await active.browser(before)
  const memberTab = await active.browser(before, active.cookies.memberCookie)
  expect((await active.session(active.first.sessionId)).title).toBeNull()
  expect(
    await (
      await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
    ).json(),
  ).toMatchObject({ workspace: { name: null } })
  expect(
    await (await active.request(workspacesPath(OUTER_ORG))).json(),
  ).toMatchObject({
    workspaces: expect.arrayContaining([
      expect.objectContaining({ id: OUTER_WORKSPACE, name: null }),
    ]),
  })
  await actor.completeTitle('**Title: "Fix chat titles."**')
  await actor.drainTitleWork()
  expect((await active.session(active.first.sessionId)).title).toBe(
    'Fix chat titles',
  )
  expect(await actor.titleCallCount()).toBe(1)
  const detail = await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
  expect(await detail.json()).toMatchObject({
    workspace: { name: 'Fix chat titles' },
  })
  const list = await active.request(workspacesPath(OUTER_ORG))
  expect(await list.json()).toMatchObject({
    workspaces: expect.arrayContaining([
      expect.objectContaining({ id: OUTER_WORKSPACE, name: 'Fix chat titles' }),
    ]),
  })
  for (const tab of [ownerTab, memberTab]) {
    await tab.inbox.next()
    await tab.inbox.next()
    expect(
      tab.messages
        .filter((message) => message.type === 'event')
        .map((message) => record(record(message.envelope).event)),
    ).toEqual([
      { type: 'workspace.title', name: 'Fix chat titles' },
      expect.objectContaining({
        type: 'session.updated',
        session: expect.objectContaining({
          id: active.first.sessionId,
          title: 'Fix chat titles',
        }),
      }),
    ])
  }
})

it('retries an empty title after a native restart with the saved first message text', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  expect(await actor.titleCallCount()).toBe(1)
  const firstCall = await actor.waitForTitleCall()
  expect(firstCall.messages?.[1].content).toBe(
    'Task message as a JSON string:\n"Keep the first message"',
  )
  await actor.completeTitle('Title: ""')
  await actor.drainTitleWork()
  expect((await active.session(active.first.sessionId)).title).toBeNull()
  await active.restart()
  const restartedBindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const restarted = restartedBindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  expect(await restarted.titleCallCount()).toBe(0)
  const nextCall = restarted.waitForTitleCall()
  const response = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, active.first.sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'retry-title-after-restart',
        text: 'Yes, do that',
        choice: active.first.request.choice,
        attachmentIds: [],
      }),
    },
  )
  expect(response.status).toBe(202)
  expect((await nextCall).messages?.[1].content).toBe(
    'Task message as a JSON string:\n"Keep the first message"',
  )
  expect(await restarted.titleCallCount()).toBe(1)
  await restarted.completeTitle('Keep the first message')
  await restarted.drainTitleWork()
  expect((await active.session(active.first.sessionId)).title).toBe(
    'Keep the first message',
  )
  expect(
    await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('name'),
  ).toBe('Keep the first message')
})
