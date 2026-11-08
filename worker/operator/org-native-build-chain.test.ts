import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { SOFTWARE } from '../lifecycle/backend-test-support'
import { readBuildJob } from '../lifecycle/build-data'
import { advanceImageBuild, startImageBuild } from '../lifecycle/image-builds'
import {
  realRuntimeFixture,
  runtimeBundle,
} from '../lifecycle/real-runtime-test-support'
import { imageRuntime } from '../lifecycle/runtime'
import { recordOrgSuspension } from './org-data'

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

it('drains every native build cleanup after org suspension and leaves no idle refresh alarm', async () => {
  const runtime = imageRuntime(fixture.env)
  const setup = {
    ...runtime,
    dependencies: { ...runtime.dependencies, fetch: fixture.boat.fetch },
    scheduler: { schedule: async () => undefined },
  }
  const input = {
    orgId: 'runtime-org',
    userId: 'runtime-user',
    kind: 'build' as const,
    software: SOFTWARE,
  }
  const older = await startImageBuild(setup, input)
  await advanceImageBuild(setup, input.orgId, older)
  await fixture.env.DB.batch([
    fixture.env.DB.prepare(
      "UPDATE image_builds SET state = 'failed', completed_at = 1, error = 'Earlier cleanup is pending.' WHERE id = ?",
    ).bind(older),
    fixture.env.DB.prepare(
      "UPDATE image_build_jobs SET phase = 'cleanup' WHERE build_id = ?",
    ).bind(older),
  ])
  const current = await startImageBuild(setup, input)
  await advanceImageBuild(setup, input.orgId, current)
  expect(fixture.boat.states.size).toBe(2)
  await recordOrgSuspension(
    fixture.env.DB,
    input.orgId,
    input.userId,
    Date.now(),
  )
  const actor = fixture.actor('org-image:runtime-org')
  await actor.scheduleImage({
    orgId: input.orgId,
    buildId: current,
    software: SOFTWARE,
    nextAt: Date.now() + 3600000,
  })
  expect(await actor.imageSchedule()).toMatchObject({ buildId: current })
  const cleanupState = async () => {
    const jobs = await Promise.all(
      [older, current].map((id) =>
        readBuildJob(fixture.env.DB, input.orgId, id),
      ),
    )
    if (jobs.every((job) => job.phase === 'done')) return 'done'
    return (await actor.alarmAt()) === null ? 'waiting' : 'scheduled'
  }
  const observed: {
    fired: boolean
    alarm: number | null
    older: string
    current: string
    removed: string[]
  }[] = []
  for (let step = 0; step < 6; step++) {
    const fired = await actor.fireScheduledAlarm()
    observed.push({
      fired,
      alarm: await actor.alarmAt(),
      older: (await readBuildJob(fixture.env.DB, input.orgId, older)).phase,
      current: (await readBuildJob(fixture.env.DB, input.orgId, current)).phase,
      removed: [...fixture.boat.deletedIds],
    })
    await expect.poll(cleanupState, { timeout: 10000 }).not.toBe('waiting')
    if ((await cleanupState()) === 'done') break
  }
  for (const id of [older, current])
    expect(
      await readBuildJob(fixture.env.DB, input.orgId, id),
      JSON.stringify(observed),
    ).toMatchObject({
      state: 'failed',
      phase: 'done',
      sandboxId: null,
    })
  expect(fixture.boat.deletedIds.sort()).toEqual(['bx_1', 'bx_2'])
  expect(fixture.boat.states.size).toBe(0)
  expect(fixture.boat.starts).toHaveLength(2)
  expect(fixture.boat.resumeIds).toEqual([])
  expect(await actor.alarmAt()).toBeNull()
})
