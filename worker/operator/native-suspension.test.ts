import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  realRuntimeFixture,
  runtimeBundle,
} from '../lifecycle/real-runtime-test-support'
import { runningRuntimeWorkspace } from '../lifecycle/runtime-lifecycle-test-support'
import { imageRuntime, workspaceRuntime } from '../lifecycle/runtime'
import { startImageBuild } from '../lifecycle/image-builds'
import { suspendUser } from './suspend-user'

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

it('retries a suspended native workspace stop after a runtime restart without a resume', async () => {
  const { workspaceId, sandboxId } = await runningRuntimeWorkspace(fixture)
  fixture.boat.failStop = true
  const result = await suspendUser(
    workspaceRuntime(fixture.env),
    11,
    'runtime-user',
  )
  expect(result.pendingWorkspaceIds).toEqual([workspaceId])
  expect(fixture.boat.stopIds).toEqual([sandboxId])
  await fixture.restart()
  fixture.boat.failStop = false
  const restored = fixture.actor(workspaceId)
  await restored.tick()
  expect(fixture.boat.stopIds).toEqual([sandboxId, sandboxId])
  expect(await restored.readLifecycle()).toMatchObject({
    state: 'stopped',
    runnerConnected: false,
    runningSessions: [],
  })
  expect(
    await fixture.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first('state'),
  ).toBe('stopped')
  await restored.tick()
  expect(fixture.boat.resumeIds).toEqual([])
})

it('schedules suspended image cleanup through the native image runtime', async () => {
  const runtime = imageRuntime(fixture.env)
  const buildId = await startImageBuild(
    { ...runtime, scheduler: { schedule: async () => undefined } },
    {
      orgId: 'runtime-org',
      userId: 'runtime-user',
      kind: 'build',
      software: {
        url: 'https://software.conductive.test/runner.tar.gz',
        sha256: 'a'.repeat(64),
      },
    },
  )
  expect(
    await fixture.actor('org-image:runtime-org').imageSchedule(),
  ).toBeUndefined()
  const at = Date.now() + 60_000
  const result = await suspendUser(
    workspaceRuntime(fixture.env, { ...runtime.dependencies, now: () => at }),
    11,
    'runtime-user',
  )
  expect(result.pendingBuildIds).toEqual([buildId])
  expect(
    await fixture.actor('org-image:runtime-org').imageSchedule(),
  ).toMatchObject({ orgId: 'runtime-org', buildId })
  expect(fixture.boat.starts).toEqual([])
})

it('closes an idle native runner after owner suspension through its scheduled access check', async () => {
  const { workspaceId } = await runningRuntimeWorkspace(fixture)
  const runner = await fixture.openRunner(workspaceId)
  runner.send({
    type: 'hello',
    protocolVersion: 1,
    workspaceId,
    streamId: 'native-idle',
  })
  expect(await runner.inbox.next()).toMatchObject({
    type: 'welcome',
    confirmedThrough: 0,
  })
  await suspendUser(workspaceRuntime(fixture.env), 11, 'runtime-user')
  await fixture.actor(workspaceId).tickRunnerAccess()
  await expect.poll(() => runner.isClosed, { timeout: 10_000 }).toBe(true)
  await runner.closed
  expect(fixture.boat.resumeIds).toEqual([])
})
