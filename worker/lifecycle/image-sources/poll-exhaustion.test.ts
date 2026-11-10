import { generateKeyPairSync } from 'node:crypto'

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ProviderError } from '../../sandbox/errors'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { SOFTWARE } from '../backend-test-support'
import { readBuild, readBuildJob } from '../build-data'
import { runImageAlarm } from '../image-timers'
import { heldOperation } from '../../test-support/held-operation'
import { nativeImageRuntime } from './image-runtime-test-support'
import { localSourceFixture } from './local-source-test-support'
import { readSourceJob } from './source-data'

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs1', format: 'pem' })
  .toString()
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('revokes source credentials and deletes the builder when its saved status retry window ends', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  const claim = heldOperation()
  try {
    let { runtime, boat } = await nativeImageRuntime(fixture)
    let now = TEST_TIME
    runtime.dependencies.now = () => now
    fixture.access.beforeClaim = claim.wait
    const alarm = () =>
      runImageAlarm(runtime, {
        orgId: fixture.org.id,
        software: SOFTWARE,
        buildId: fixture.input.buildId,
        nextAt: now,
      })
    await alarm()
    await fixture.provider.settle()
    fixture.provider.beforeStatus = async () => {
      throw new ProviderError('unavailable', 503)
    }
    await alarm()
    fixture.provider.beforeStatus = undefined
    now += 1_000
    await alarm()
    expect(
      (
        await readBuildJob(
          fixture.env.DB,
          fixture.org.id,
          fixture.input.buildId,
        )
      ).providerRetry,
    ).toBeNull()
    const restarted = await nativeImageRuntime(fixture)
    runtime = restarted.runtime
    boat = restarted.boat
    runtime.dependencies.now = () => now
    now = TEST_TIME + 610_000
    await alarm()
    await claim.entered
    expect(
      await readSourceJob(fixture.env.DB, fixture.input.buildId),
    ).toMatchObject({ phase: 'fetch', processId: 2 })
    fixture.provider.beforeStatus = async () => {
      throw new ProviderError('unavailable', 503)
    }
    await alarm()
    expect(
      (
        await readBuildJob(
          fixture.env.DB,
          fixture.org.id,
          fixture.input.buildId,
        )
      ).providerRetry,
    ).toEqual({ openedAt: now, failures: 1, retryAt: now + 1_000 })
    now += 600_000
    await alarm()
    expect(
      await readBuildJob(fixture.env.DB, fixture.org.id, fixture.input.buildId),
    ).toMatchObject({ state: 'failed', phase: 'done' })
    expect(
      (await readBuild(fixture.env.DB, fixture.org.id, fixture.input.buildId))
        .build.error,
    ).toBe(
      'The cloud computer image could not build. Check the log and try again.',
    )
    expect(
      await readSourceJob(fixture.env.DB, fixture.input.buildId),
    ).toBeNull()
    expect(fixture.access.activeTokens).toEqual([])
    expect(boat.deletedIds).toEqual(['builder-one'])
    expect(fixture.provider.commands).toHaveLength(2)
    expect(fixture.access.events).not.toContain('finalize')
  } finally {
    claim.release()
    await fixture.dispose()
  }
})
