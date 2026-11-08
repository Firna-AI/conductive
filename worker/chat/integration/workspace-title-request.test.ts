import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePath, workspacesPath } from '../../../src/shared/workspaces'
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
  expect((await active.session(active.first.sessionId)).title).toBe(
    OUTER_WORKSPACE,
  )
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
