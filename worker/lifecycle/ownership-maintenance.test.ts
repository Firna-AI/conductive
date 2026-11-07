import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { removeOrgMember } from '../members/membership'
import { reassignWorkspace } from '../members/ownership'
import { suspendUser } from '../operator/suspend-user'
import { workspaceOwnerChangedHook } from './ownership-maintenance'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { runningRuntimeWorkspace } from './runtime-lifecycle-test-support'
import { workspaceRuntime } from './runtime'
import { readWorkspace, workspaceView } from './workspace-data'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => {
  await fixture.dispose()
})

it.each(['reassign', 'remove'] as const)(
  'rearms native stopped disk maintenance after an active admin takes ownership through %s',
  async (change) => {
    const { actor, workspaceId } = await runningRuntimeWorkspace(fixture)
    await suspendUser(workspaceRuntime(fixture.env), 11, 'runtime-user')
    const stopped = await actor.readLifecycle()
    if (!stopped) throw new Error('Missing stopped lifecycle')
    const nextKeepaliveAt = stopped.nextDiskKeepaliveAt
    expect(stopped.state).toBe('stopped')
    expect(await actor.alarmAt()).toBeNull()
    await fixture.env.DB.batch([
      fixture.env.DB.prepare(
        "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('active-admin', 12, 'active-admin', 0, 0)",
      ),
      fixture.env.DB.prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('runtime-org', 'active-admin', 'admin', 1)",
      ),
    ])
    const runtime = workspaceRuntime(fixture.env)
    const hooks = {
      workspaceOwnerChanged: workspaceOwnerChangedHook(runtime),
      readWorkspace: async (orgId: string, id: string) =>
        workspaceView(await readWorkspace(fixture.env.DB, orgId, id)),
    }
    const requests = fixture.requests.length
    if (change === 'reassign') {
      await reassignWorkspace(
        fixture.env.DB,
        'runtime-org',
        'active-admin',
        workspaceId,
        'active-admin',
        Date.now(),
        hooks,
      )
    } else {
      await removeOrgMember(
        fixture.env.DB,
        'runtime-org',
        'active-admin',
        'runtime-user',
        Date.now(),
        hooks,
      )
    }
    expect(await actor.alarmAt()).toBe(stopped.nextDiskKeepaliveAt)
    expect(await actor.readLifecycle()).toEqual(stopped)
    expect(fixture.requests.slice(requests)).toEqual([])
    expect(fixture.boat.resumeIds).toEqual([])
    await fixture.restart()
    expect(await fixture.actor(workspaceId).alarmAt()).toBe(nextKeepaliveAt)
  },
)
