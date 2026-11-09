import { afterEach, beforeAll, expect, it } from 'vitest'

import { readCreated } from '../../../src/app/api/read-workspaces'
import { sessionPaths } from '../../../src/shared/sessions'
import { workspacePaths, workspacesPath } from '../../../src/shared/workspaces'
import { recordOrgSuspension } from '../../operator/org-data'
import { readWorkspaceToken } from '../../lifecycle/tokens'
import type { WorkspaceStartResult } from '../../lifecycle/start-types'
import { CLAUDE } from '../harness.test-support'
import { readChatHistoryPages } from './history-pages.test-support'
import type { Workspace } from './journey-entry.test-support'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_REPOSITORY } from './outer-seed.test-support'
import { requestRunner } from './runner-socket.test-support'
import { driveWorkspaceStart } from './workspace-start.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/journey-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

async function failedWorkspace(deletionFailures: number) {
  const active = (fixture = await createOuterRuntime(bundle))
  const response = await active.request(workspacesPath(OUTER_ORG), {
    method: 'POST',
    body: JSON.stringify({
      repositoryId: OUTER_REPOSITORY,
      firstMessage: {
        id: 'kept-first',
        text: 'Keep this work',
        choice: CLAUDE,
        attachmentIds: [],
      },
    }),
  })
  expect(response.status).toBe(201)
  const created = readCreated(await response.json())
  const id = created.workspace.id
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = bindings.WORKSPACES.getByName(id)
  active.boat.commandExitCode = 1
  active.boat.deleteFailures = deletionFailures
  expect(
    await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
      actor,
      actor.waitCreationLifecycle(),
    ),
  ).toMatchObject({ ok: false })
  return { active, actor, created, id }
}

it('archives a kept failed workspace without abandoning its pending computer cleanup', async () => {
  const { active, actor, created, id } = await failedWorkspace(1)
  expect(active.boat.deletedIds).toEqual([])
  const archived = await active.request(workspacePaths.archive(OUTER_ORG, id), {
    method: 'POST',
    body: '{}',
  })
  expect(archived.status).toBe(200)
  expect(await archived.json()).toMatchObject({
    workspace: { id, state: 'archived' },
  })
  expect(await actor.readScheduledAlarm()).not.toBeNull()
  await actor.advanceStartAlarm()
  expect(active.boat.deletedIds).toHaveLength(1)
  const history = await readChatHistoryPages(
    active.request,
    OUTER_ORG,
    id,
    created.sessionId,
  )
  expect(history.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: { type: 'message.accepted', message: created.firstMessage },
      }),
    ]),
  )
  const retry = await active.request(workspacePaths.resume(OUTER_ORG, id), {
    method: 'POST',
    body: '{}',
  })
  expect(retry.status).toBe(409)
  const send = await active.request(
    sessionPaths.messages(OUTER_ORG, id, created.sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'after-archive',
        text: 'Work',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(send.status).toBe(409)
  expect(active.boat.starts).toHaveLength(1)
})

it('stops a queued first-start replacement when its org is suspended before allocation', async () => {
  const { active, actor, created, id } = await failedWorkspace(0)
  active.boat.commandExitCode = 0
  const retry = await active.request(workspacePaths.resume(OUTER_ORG, id), {
    method: 'POST',
    body: '{}',
  })
  expect(retry.status).toBe(200)
  await recordOrgSuspension(
    active.env.DB,
    OUTER_ORG,
    'owner',
    1_800_000_000_000,
  )
  await actor.advanceStartAlarm()
  expect(await actor.waitCreationLifecycle()).toMatchObject({
    ok: false,
    error: { code: 'org_suspended' },
  })
  expect(active.boat.starts).toHaveLength(1)
  await expect(readWorkspaceToken(active.env, id)).rejects.toMatchObject({
    code: 'workspace_token_unavailable',
  })
  const send = await active.request(
    sessionPaths.messages(OUTER_ORG, id, created.sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'after-suspension',
        text: 'Work',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(send.status).toBe(403)
  expect((await requestRunner(active, 'unused-token')).status).toBe(401)
  expect(
    (
      await readChatHistoryPages(
        active.request,
        OUTER_ORG,
        id,
        created.sessionId,
      )
    ).events,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: { type: 'message.accepted', message: created.firstMessage },
      }),
    ]),
  )
})
