import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../src/shared/workspaces'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  RESTART_COMMAND,
  UPDATE_CHECK_COMMAND,
} from '../lifecycle/software-restart'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('restarts through the Worker route for a member, and refuses an outsider, a suspended org, a suspended owner, and a second restart', async () => {
  const active = (fixture = await featureFixture(bundle))
  const db = active.env.DB
  await db
    .prepare("UPDATE workspaces SET sandbox_id = 'bx_restart' WHERE id = ?")
    .bind(OUTER_WORKSPACE)
    .run()
  await active.host.seed(OUTER_ORG, OUTER_WORKSPACE, 'bx_restart')
  await active.actor().seedFeatureState({
    'lifecycle:state': {
      workspaceId: OUTER_WORKSPACE,
      orgId: OUTER_ORG,
      state: 'ready',
      start: null,
      pendingFirstMessage: null,
      lastActivityAt: 0,
      runningSessions: [],
      runnerConnected: true,
      stoppedAt: null,
      nextDiskKeepaliveAt: null,
      error: null,
    },
  })
  const restart = async (cookie: string) => {
    const response = await active.request(
      workspacePaths.restart(OUTER_ORG, OUTER_WORKSPACE),
      { method: 'POST', body: '{}', headers: { Cookie: cookie } },
    )
    return { status: response.status, body: await response.json() }
  }
  const restarts = (commands: readonly string[]) =>
    commands.filter(
      (command) =>
        command === UPDATE_CHECK_COMMAND || command === RESTART_COMMAND,
    )
  const { memberCookie, outsiderCookie } = active.cookies
  expect((await restart(outsiderCookie)).status).toBe(404)
  await db
    .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  expect((await restart(memberCookie)).status).toBe(403)
  await db
    .prepare('UPDATE orgs SET suspended_at = NULL WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  await db.prepare("UPDATE users SET suspended_at = 1 WHERE id = 'owner'").run()
  expect((await restart(memberCookie)).status).toBe(403)
  await db
    .prepare("UPDATE users SET suspended_at = NULL WHERE id = 'owner'")
    .run()
  expect(restarts(active.boat.commands)).toEqual([])
  expect(await restart(memberCookie)).toEqual({
    status: 200,
    body: { updateCheck: 'ok' },
  })
  expect(restarts(active.boat.commands)).toEqual([
    UPDATE_CHECK_COMMAND,
    RESTART_COMMAND,
  ])
  expect(restarts(active.host.commands)).toEqual([
    UPDATE_CHECK_COMMAND,
    RESTART_COMMAND,
  ])
  expect(await restart(memberCookie)).toMatchObject({
    status: 409,
    body: { error: { code: 'workspace_not_running' } },
  })
  expect(restarts(active.boat.commands)).toHaveLength(2)
})
