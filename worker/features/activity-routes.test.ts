import { afterEach, beforeAll, expect, it } from 'vitest'

import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { barrier } from '../previews/stream-test-support'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { WebSocket } from 'miniflare'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import {
  activityFixture,
  hostedActivityPort,
  openActivityPreview,
  openActivityTerminal,
  TerminalActivityUpstream,
  type ActivityFixture,
} from './activity.test-support'

let bundle: string
let fixture: ActivityFixture | undefined
const sockets: WebSocket[] = []
const releases: (() => void)[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/activity-entry.test-support.ts',
  )
})
afterEach(async () => {
  for (const release of releases) release()
  releases.length = 0
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
})

it('forwards terminal and preview input and runner state during a failed provider update, then retries the latest minute', async () => {
  const started = barrier<void>()
  const release = barrier<void>()
  releases.push(() => release.resolve())
  const warnings: unknown[] = []
  const deadlines: unknown[] = []
  let running = 0
  let maximum = 0
  const terminal = new TerminalActivityUpstream()
  const active = (fixture = await activityFixture(bundle, {
    handleStructuredLogs: (event) => {
      if (event.level === 'warn') warnings.push(event)
    },
    outbound: async (request, fallback) => {
      if (request.method === 'PATCH') {
        deadlines.push(await request.clone().json())
        running++
        maximum = Math.max(maximum, running)
        if (deadlines.length === 1) {
          started.resolve()
          await release.promise
          running--
          return Response.json(
            { ok: false, message: 'private activity secret' },
            { status: 503 },
          )
        }
        running--
      }
      const socket = terminal.fetch(request)
      if (socket) return socket
      return (await hostedActivityPort(request)) ?? fallback(request)
    },
  }))
  const forward = await openActivityPreview(active)
  const response = await forward()
  expect(await response.text()).toBe('forwarded input')
  await started.promise
  expect(deadlines).toEqual([{ ttlSeconds: 1860 }])
  const browser = await openActivityTerminal(active)
  sockets.push(browser)
  browser.send('{"columns":80,"rows":24}')
  expect(JSON.parse(await terminal.next())).toEqual({
    columns: 80,
    rows: 24,
    AuthToken: btoa(`conductive:${'b'.repeat(64)}`),
  })
  await active.actor().runnerLifecycleDisconnected()
  await active.actor().reportRunnerLifecycle({ type: 'runner.ready' })
  await active.actor().advanceActivity(20_000)
  for (let input = 0; input < 4; input++)
    expect(await (await forward()).text()).toBe('forwarded input')
  browser.send('0pwd\r')
  expect(await terminal.next()).toBe('0pwd\r')
  await active.actor().waitForLocalActivity()
  expect(await active.actor().readLifecycle()).toMatchObject({
    lastActivityAt: active.now + 20_000,
    state: 'ready',
    runnerConnected: true,
  })
  expect(await active.actor().readChatWorkspaceSummary()).toEqual({
    throughEventNumber: 1,
    lastOutputEventNumber: 0,
    working: false,
  })
  await active.actor().advanceActivity(40_000)
  expect(deadlines).toHaveLength(1)
  release.resolve()
  await active.actor().waitForActivity()
  browser.send('0ls\r')
  expect(await terminal.next()).toBe('0ls\r')
  expect(browser.readyState).toBe(WebSocket.READY_STATE_OPEN)
  await active.actor().waitForLocalActivity()
  expect(await active.actor().readLifecycle()).toMatchObject({
    lastActivityAt: active.now + 20_000,
  })
  expect(deadlines).toEqual([{ ttlSeconds: 1860 }, { ttlSeconds: 1860 }])
  expect(maximum).toBe(1)
  expect(active.boat.sandboxReads).toEqual(['bx_activity'])
  expect(warnings).toHaveLength(1)
  expect(JSON.stringify(warnings)).toContain(
    'Workspace activity update failed.',
  )
  expect(JSON.stringify(warnings)).not.toContain('private activity secret')
  expect(
    await active.env.DB.prepare(
      'SELECT last_activity_at AS activity FROM workspaces WHERE id = ?',
    )
      .bind(OUTER_WORKSPACE)
      .first('activity'),
  ).toBe(active.now + 20_000)
})

it.each(['start', 'generation'] as const)(
  'ignores a delayed provider error after a newer %s',
  async (change) => {
    const started = barrier<void>()
    const release = barrier<void>()
    releases.push(() => release.resolve())
    const active = (fixture = await activityFixture(bundle, {
      outbound: async (request, fallback) => {
        if (request.method === 'PATCH') {
          started.resolve()
          await release.promise
          return Response.json({
            ok: true,
            type: 'sandbox.info',
            sandbox: { id: 'bx_activity', state: 'error' },
          })
        }
        return (await hostedActivityPort(request)) ?? fallback(request)
      },
    }))
    const forward = await openActivityPreview(active)
    expect(await (await forward()).text()).toBe('forwarded input')
    await started.promise
    await active.actor().advanceActivity(500)
    if (change === 'generation') {
      await active.env.DB.prepare(
        'UPDATE orgs SET lifecycle_generation = 1 WHERE id = ?',
      )
        .bind(OUTER_ORG)
        .run()
      expect(
        await active
          .actor()
          .restoreMemberLifecycle(
            { orgId: OUTER_ORG, generation: 1 },
            null,
            null,
          ),
      ).toMatchObject({ ok: true })
    }
    if (change === 'start') {
      await active.actor().beginLifecycleStart('resume')
      await active.actor().lifecyclePrepared()
      await active.actor().reportRunnerLifecycle({ type: 'runner.ready' })
    } else {
      await active.actor().lifecycleActivity()
      await active.actor().waitForLocalActivity()
    }
    release.resolve()
    await active.actor().waitForActivity()
    expect(await active.actor().readLifecycle()).toMatchObject({
      state: 'ready',
      runnerConnected: true,
      lastActivityAt: active.now + 500,
      start:
        change === 'start'
          ? { kind: 'resume', startedAt: active.now + 500 }
          : null,
    })
  },
)

it('ignores a delayed provider error after the workspace stops', async () => {
  const started = barrier<void>()
  const release = barrier<void>()
  releases.push(() => release.resolve())
  const active = (fixture = await activityFixture(bundle, {
    outbound: async (request, fallback) => {
      if (request.method === 'PATCH') {
        started.resolve()
        await release.promise
        return Response.json({
          ok: true,
          type: 'sandbox.info',
          sandbox: { id: 'bx_activity', state: 'error' },
        })
      }
      return (await hostedActivityPort(request)) ?? fallback(request)
    },
  }))
  const forward = await openActivityPreview(active)
  expect(await (await forward()).text()).toBe('forwarded input')
  await started.promise
  await active.actor().lifecycleStopped()
  expect(await active.actor().readLifecycle()).toMatchObject({
    state: 'stopped',
  })
  release.resolve()
  await active.actor().waitForActivity()
  expect(await active.actor().readLifecycle()).toMatchObject({
    state: 'stopped',
    runnerConnected: false,
  })
})
