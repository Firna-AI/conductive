import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { activeRuntimeOwner } from '../lifecycle/ownership-maintenance-test-support'
import { imageRuntime } from '../lifecycle/runtime'
import { readBuildJob } from '../lifecycle/build-data'
import { startImageBuild } from '../lifecycle/image-builds'
import {
  realRuntimeFixture,
  runtimeBundle,
} from '../lifecycle/real-runtime-test-support'
import { nativeSuspensionRuntime } from './native-runtime.test-support'
import { suspendOrg } from './suspend-org'

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

it('fails a queued native image build of another starter without allocating a computer', async () => {
  await activeRuntimeOwner(fixture)
  const runtime = imageRuntime(fixture.env)
  const buildId = await startImageBuild(
    { ...runtime, scheduler: { schedule: async () => undefined } },
    {
      orgId: 'runtime-org',
      userId: 'active-admin',
      kind: 'build',
      software: {
        url: 'https://software.conductive.test/runner.tar.gz',
        sha256: 'a'.repeat(64),
      },
    },
  )
  const result = await suspendOrg(
    nativeSuspensionRuntime(fixture),
    'runtime-org',
    'runtime-user',
  )
  expect(result.pendingBuildIds).toEqual([buildId])
  await fixture.restart()
  await fixture.actor('org-image:runtime-org').tick()
  expect(
    await readBuildJob(fixture.env.DB, 'runtime-org', buildId),
  ).toMatchObject({ state: 'failed', phase: 'done', sandboxId: null })
  expect(fixture.boat.starts).toEqual([])
})

it('recovers and removes a native build allocation whose response was lost before org suspension', async () => {
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
  fixture.boat.lostCreateReplies = 1
  await fixture.actor('org-image:runtime-org').scheduleImage({
    orgId: 'runtime-org',
    buildId,
    software: {
      url: 'https://software.conductive.test/runner.tar.gz',
      sha256: 'a'.repeat(64),
    },
    nextAt: Date.now(),
  })
  await fixture.actor('org-image:runtime-org').tick()
  expect(fixture.boat.states.size).toBe(1)
  expect(
    await readBuildJob(fixture.env.DB, 'runtime-org', buildId),
  ).toMatchObject({ state: 'running', phase: 'allocating', sandboxId: null })
  await suspendOrg(
    nativeSuspensionRuntime(fixture),
    'runtime-org',
    'runtime-user',
  )
  await fixture.env.DB.prepare(
    `UPDATE image_builds SET provider_retry_json = json_set(provider_retry_json, '$.retryAt', 0) WHERE id = ?`,
  )
    .bind(buildId)
    .run()
  await fixture.restart()
  for (let step = 0; step < 4; step++)
    await fixture.actor('org-image:runtime-org').tick()
  expect(
    await readBuildJob(fixture.env.DB, 'runtime-org', buildId),
  ).toMatchObject({ state: 'failed', phase: 'done', sandboxId: null })
  expect(
    await fixture.env.DB.prepare('SELECT error FROM image_builds WHERE id = ?')
      .bind(buildId)
      .first('error'),
  ).toBe(
    'This org is suspended. For questions, write to abuse@conductive.build.',
  )
  expect(fixture.boat.states.size).toBe(0)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
})
