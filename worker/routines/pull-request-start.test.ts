import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { startRoutineRun } from './run-starter'
import { runFixture } from './runs.test-support'

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

it.each(['pushed', 'merged'] as const)(
  'creates a %s run with its saved base and event commit',
  async (event) => {
    const fixture = await runFixture(harness)
    await fixture.seedRun('pull-run', {
      kind: 'pull-request',
      event,
      number: 482,
      url: 'https://github.com/example/repository/pull/482',
      headBranch: 'feature/review',
      headSha: 'a'.repeat(40),
      baseBranch: 'release/next',
    })
    await fixture.run(() =>
      startRoutineRun(fixture.runtime, fixture.org.id, 'pull-run'),
    )
    const id = await fixture.runtime.env.DB.prepare(
      'SELECT workspace_id FROM routine_runs',
    ).first<string>('workspace_id')
    const start = fixture.starts.get(id!)!
    expect(await start.job()).toMatchObject({
      providerAccount: 'boat',
      baseBranch: event === 'merged' ? 'release/next' : 'feature/review',
      startSha: event === 'merged' ? undefined : 'a'.repeat(40),
    })
    expect(
      await fixture.runtime.env.DB.prepare(
        `SELECT base_branch AS baseBranch, start_sha AS startSha,
          provider_account AS providerAccount FROM workspace_creation_plans`,
      ).first(),
    ).toEqual({
      baseBranch: event === 'merged' ? 'release/next' : 'feature/review',
      startSha: event === 'merged' ? null : 'a'.repeat(40),
      providerAccount: 'boat',
    })
    await start.restart()
    for (let phase = 0; phase < 20; phase++) {
      const job = await start.job()
      if (!job || job.phase === 'runner') break
      await start.advance()
    }
    expect((await start.job())?.phase).toBe('runner')
    expect(fixture.boat.starts[0]).toMatchObject({
      env: {
        CONDUCTIVE_DEFAULT_BRANCH:
          event === 'merged' ? 'release/next' : 'feature/review',
      },
    })
    const actor = fixture.actors.get(id!)!.endpoint()
    const state = await actor.readLifecycle()
    expect(state?.start?.steps).toContainEqual(
      expect.objectContaining({
        id: 'fetch',
        label:
          event === 'merged'
            ? 'Fetching release/next of repository'
            : 'Fetching pull request #482 of repository',
        state: 'completed',
      }),
    )
  },
)
