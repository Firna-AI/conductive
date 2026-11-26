import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { advanceImageBuild, startImageBuild } from './image-builds'

const backendFixture = setupBackendTests()

type Fixture = Awaited<ReturnType<typeof backendFixture>>

/** Advances one alarm step a second, so that each step gets its own times. */
async function finishTimed(fixture: Fixture, id: string): Promise<void> {
  for (let step = 1; step <= 30; step++) {
    await fixture.setTime(TEST_TIME + step * 1_000)
    if (await advanceImageBuild(fixture.images, fixture.org.id, id)) return
  }
  throw new Error('Build did not finish')
}

async function jobSteps(fixture: Fixture, id: string) {
  return (
    await fixture.runtime.env.DB.prepare(
      `SELECT step, job_kind AS kind, org_id AS orgId, started_at AS startedAt,
         ended_at AS endedAt, outcome FROM job_steps WHERE job_id = ?
       ORDER BY started_at, step`,
    )
      .bind(id)
      .all<{
        step: string
        kind: string
        orgId: string
        startedAt: number
        endedAt: number | null
        outcome: string | null
      }>()
  ).results
}

it('records each step of a build from the request for its computer to the publish', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user } = fixture
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finishTimed(fixture, id)
    const steps = await jobSteps(fixture, id)
    expect(steps.map((step) => step.step).sort()).toEqual([
      'computer:boot',
      'computer:request',
      'phase:allocating',
      'phase:install',
      'phase:publish',
      'phase:snapshot',
      'phase:software',
      'phase:sources',
    ])
    for (const step of steps) {
      expect(step).toMatchObject({ kind: 'build', orgId: org.id })
      expect(step.outcome).toBe('done')
      expect(step.endedAt).toBeGreaterThanOrEqual(step.startedAt)
    }
    const byName = new Map(steps.map((step) => [step.step, step]))
    expect(byName.get('computer:boot')?.startedAt).toBe(
      byName.get('computer:request')?.endedAt,
    )
    expect(byName.get('computer:boot')?.endedAt).toBeLessThanOrEqual(
      byName.get('phase:sources')?.endedAt ?? 0,
    )
    expect(byName.get('phase:sources')?.startedAt).toBe(
      byName.get('phase:allocating')?.endedAt,
    )
    expect(byName.get('phase:install')?.startedAt).toBe(
      byName.get('phase:software')?.endedAt,
    )
    const { completedAt } = (await fixture.runtime.env.DB.prepare(
      'SELECT completed_at AS completedAt FROM image_builds WHERE id = ?',
    )
      .bind(id)
      .first<{ completedAt: number }>()) ?? { completedAt: 0 }
    expect(byName.get('phase:publish')?.endedAt).toBe(completedAt)
  } finally {
    await fixture.dispose()
  }
})

it('records a refresh without an install step', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user } = fixture
    const build = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finishTimed(fixture, build)
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'refresh',
      software: SOFTWARE,
    })
    for (let step = 1; step <= 30; step++) {
      await fixture.setTime(TEST_TIME + 60_000 + step * 1_000)
      if (await advanceImageBuild(images, org.id, id)) break
    }
    const steps = await jobSteps(fixture, id)
    expect(steps.map((step) => step.step)).not.toContain('phase:install')
    expect(steps.map((step) => step.step)).toContain('phase:snapshot')
    expect(new Set(steps.map((step) => step.kind))).toEqual(
      new Set(['refresh']),
    )
    expect(steps.every((step) => step.outcome === 'done')).toBe(true)
  } finally {
    await fixture.dispose()
  }
})

it('closes the open step of a failed build as failed', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user, boat } = fixture
    boat.commandExitCode = 1
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finishTimed(fixture, id)
    const steps = await jobSteps(fixture, id)
    expect(steps.at(-1)).toMatchObject({
      step: 'phase:software',
      outcome: 'failed',
    })
    expect(steps.slice(0, -1).every((step) => step.outcome === 'done')).toBe(
      true,
    )
    expect(steps.every((step) => step.endedAt !== null)).toBe(true)
    expect(steps.map((step) => step.step)).not.toContain('phase:snapshot')
  } finally {
    await fixture.dispose()
  }
})
