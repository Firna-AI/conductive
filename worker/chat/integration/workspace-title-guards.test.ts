import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePath, workspacePaths } from '../../../src/shared/workspaces'
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

async function setup() {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  await actor.waitForTitleCall()
  return { active, actor }
}

it('keeps a route name and confirms a runner title without changing names or history', async () => {
  const { active, actor } = await setup()
  const renamed = await active.request(
    workspacePath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New session' }),
    },
  )
  expect(renamed.status).toBe(200)
  const before = await active.history(active.first.sessionId)
  const session = await active.session(active.first.sessionId)
  active.runner.emit({ type: 'workspace.title', name: 'Runner replacement' })
  expect(await active.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  await actor.completeTitle('Model replacement')
  await actor.drainTitleWork()
  expect(await active.history(active.first.sessionId)).toEqual(before)
  expect(await active.session(active.first.sessionId)).toEqual(session)
  expect(
    await (
      await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
    ).json(),
  ).toMatchObject({ workspace: { name: 'New session' } })
  expect(
    await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('name'),
  ).toBe('New session')
  const sent = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, active.first.sessionId),
    {
      method: 'POST',
      body: JSON.stringify({ ...active.first.request, id: 'after-route-name' }),
    },
  )
  expect(sent.status).toBe(202)
  await actor.drainTitleWork()
  expect(await actor.titleCallCount()).toBe(1)
})

it('keeps a set name in detail reads and repairs after a stored title and restart', async () => {
  const { active, actor } = await setup()
  await actor.completeTitle('First automatic title')
  await actor.drainTitleWork()
  const renamed = await active.request(
    workspacePath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({ name: 'delft' }),
    },
  )
  expect(renamed.status).toBe(200)
  await active.restart()
  expect(
    await (
      await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
    ).json(),
  ).toMatchObject({ workspace: { name: 'delft' } })
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  await bindings.WORKSPACES.getByName(OUTER_WORKSPACE).lifecycleStep(
    'repair-title',
    'Updating the workspace',
    'running',
  )
  expect(
    await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('name'),
  ).toBe('delft')
})

it('stores no title or session change when a pending model title completes after Archive', async () => {
  const { active, actor } = await setup()
  active.boat.synchronousOutput = '\0' + '0\n'
  const archived = await active.request(
    workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ discardUnpushedWork: true }),
    },
  )
  expect(archived.status).toBe(200)
  const before = await active.history(active.first.sessionId)
  const session = await active.session(active.first.sessionId)
  const workspace = record(
    await (
      await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
    ).json(),
  ).workspace
  await actor.completeTitle('A late title')
  await actor.drainTitleWork()
  expect(await active.history(active.first.sessionId)).toEqual(before)
  expect(await active.session(active.first.sessionId)).toEqual(session)
  expect(
    record(
      await (
        await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).workspace,
  ).toEqual(workspace)
  expect(
    await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('name'),
  ).toBe('')
})

it.each(['suspended_at', 'deleted_at'] as const)(
  'stores no automatic title after the org sets %s',
  async (column) => {
    const { active, actor } = await setup()
    const before = await actor.readChatWorkspaceSummary()
    await active.env.DB.prepare(`UPDATE orgs SET ${column} = 1 WHERE id = ?`)
      .bind(OUTER_ORG)
      .run()
    await actor.completeTitle('A late title')
    await actor.drainTitleWork()
    expect(await actor.readChatWorkspaceSummary()).toEqual(before)
    expect(
      await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
        .bind(OUTER_WORKSPACE)
        .first('name'),
    ).toBe('')
  },
)
