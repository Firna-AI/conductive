import { beforeAll, expect, it } from 'vitest'

import { orgSuspensionPath } from '../../src/shared/operator'
import { createApp } from '../application'
import { boatRoute } from '../sandbox/routes'
import { SESSION_COOKIE } from '../security/cookies'
import { sign } from '../security/crypto'
import { refreshSignal } from '../security/github-test-support'
import { heldOperation } from '../test-support/held-operation'
import {
  realRuntimeFixture,
  runtimeBundle,
} from '../lifecycle/real-runtime-test-support'
import { runningRuntimeWorkspace } from '../lifecycle/runtime-lifecycle-test-support'

let bundle: string
beforeAll(async () => {
  bundle = await runtimeBundle()
})

it('keeps a failed workspace pending in repeated org suspension until native Delete cleanup succeeds', async () => {
  const fixture = await realRuntimeFixture(bundle)
  const allocation = heldOperation()
  const deletion = refreshSignal()
  let refuseDelete = true
  const route = boatRoute({ operation: 'delete', sandboxId: 'bx_1' })
  const fetch = fixture.boat.fetch
  fixture.boat.fetch = async (request) => {
    if (
      refuseDelete &&
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
    ) {
      deletion.resolve()
      return Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
    }
    return fetch(request)
  }
  fixture.boat.lostCreateReplies = 1
  fixture.boat.afterLostCreate = allocation.wait
  const creating = runningRuntimeWorkspace(fixture)
  const failed = creating.then(
    () => null,
    (error: unknown) => {
      if (!(error instanceof Error)) throw error
      return error.message
    },
  )
  try {
    const app = createApp()
    const session = await sign(
      {
        sessionId: 'runtime-browser-session',
        expiresAt: 4_000_000_000_000,
      },
      'session',
      fixture.env.SESSION_SIGNING_KEY,
    )
    const suspend = () =>
      app.fetch(
        new Request(
          `${fixture.env.APP_ORIGIN}${orgSuspensionPath('runtime-org')}`,
          {
            method: 'POST',
            headers: {
              Origin: fixture.env.APP_ORIGIN ?? '',
              Cookie: `${SESSION_COOKIE}=${session}`,
              'Content-Type': 'application/json',
            },
            body: '{}',
          },
        ),
        { ...fixture.env, OPERATOR_GITHUB_IDS: '11' },
      )
    await allocation.entered
    const first = await suspend()
    expect(first.status).toBe(202)
    expect(await first.json()).toMatchObject({
      pendingWorkspaceIds: ['runtime-state-workspace'],
    })
    allocation.release()
    await deletion.promise
    expect(await failed).toBe('Runtime create failed: org_suspended')
    const counts = await fixture.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM workspaces) AS workspaces,
        (SELECT COUNT(*) FROM workspace_tokens) AS tokens,
        (SELECT COUNT(*) FROM workspace_tokens WHERE revoked_at IS NULL) AS activeTokens,
        (SELECT COUNT(*) FROM lifecycle_sandbox_cleanup) AS cleanup`,
    ).first()
    expect(counts).toEqual({
      workspaces: 1,
      tokens: 1,
      activeTokens: 0,
      cleanup: 1,
    })
    expect(fixture.boat.states.get('bx_1')).toBe('ready')
    expect(
      await fixture.actor('runtime-state-workspace').alarmAt(),
    ).not.toBeNull()
    const repeated = await suspend()
    expect(repeated.status).toBe(202)
    expect(await repeated.json()).toMatchObject({
      orgId: 'runtime-org',
      pendingWorkspaceIds: ['runtime-state-workspace'],
      pendingBuildIds: [],
    })
    expect(
      await fixture.actor('runtime-state-workspace').alarmAt(),
    ).not.toBeNull()
    expect(fixture.boat.stopIds).toEqual([])
    refuseDelete = false
    await fixture.restart()
    expect(
      await fixture.actor('runtime-state-workspace').fireScheduledAlarm(),
    ).toBe(true)
    expect(fixture.boat.deletedIds).toEqual(['bx_1'])
    expect(fixture.boat.states.size).toBe(0)
    expect(
      await fixture.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM lifecycle_sandbox_cleanup',
      ).first('count'),
    ).toBe(0)
    const complete = await suspend()
    expect(complete.status).toBe(200)
    expect(await complete.json()).toMatchObject({
      pendingWorkspaceIds: [],
      pendingBuildIds: [],
    })
    expect(fixture.boat.stopIds).toEqual([])
  } finally {
    allocation.release()
    await Promise.allSettled([creating, failed])
    await fixture.dispose()
  }
})
