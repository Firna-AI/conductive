import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { RoutineRunTrigger } from '../../src/shared/routines'
import { workspaceViewPath } from '../../src/shared/workspace-view'
import { createHarness, type TestHarness } from '../test-support/harness'
import { startRoutineRun } from './run-starter'
import { runFixture } from './runs.test-support'

let h: TestHarness
beforeAll(async () => {
  h = await createHarness()
})
beforeEach(async () => {
  await h.reset()
})
afterAll(async () => {
  await h.dispose()
})

const cases = [
  { trigger: { kind: 'run-now' }, pullRequest: null },
  {
    trigger: {
      kind: 'schedule',
      schedule: 'daily',
      scheduledAt: 1_800_000_000_000,
    },
    pullRequest: null,
  },
  {
    trigger: {
      kind: 'pull-request',
      event: 'pushed',
      number: 482,
      url: 'https://github.com/example/repository/pull/482',
      headBranch: 'feature/review',
      headSha: 'a'.repeat(40),
      baseBranch: 'main',
    },
    pullRequest: {
      number: 482,
      url: 'https://github.com/example/repository/pull/482',
    },
  },
] satisfies readonly {
  trigger: RoutineRunTrigger
  pullRequest: { number: number; url: string } | null
}[]

it.each(cases)(
  'returns the resolved workspace base and keeps it out of view writes for $trigger.kind',
  async ({ trigger, pullRequest }) => {
    const fixture = await runFixture(h)
    await fixture.seedRun('run-one', trigger)
    await fixture.run(() =>
      startRoutineRun(fixture.runtime, fixture.org.id, 'run-one'),
    )
    const id = await h.env.DB.prepare(
      'SELECT workspace_id FROM routine_runs',
    ).first<string>('workspace_id')
    const path = workspaceViewPath(fixture.org.id, id!)
    const initial = await h.request(path, fixture.session)
    expect(initial.status).toBe(200)
    expect(await initial.json()).toMatchObject({
      baseBranch: trigger.kind === 'pull-request' ? 'feature/review' : 'main',
      routine: { id: 'routine-one', name: 'Morning summary', pullRequest },
    })
    await h.env.DB.prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
      .bind('feature/review', id)
      .run()
    const view = {
      tabs: [],
      activeTab: null,
      temporaryTab: null,
      fileList: 'all',
      tool: 'terminal',
    }
    const updated = await h.request(path, fixture.session, {
      method: 'PUT',
      body: JSON.stringify({
        ...view,
        baseBranch: 'foreign/branch',
        routine: { id: 'foreign-routine', name: 'Foreign', pullRequest: null },
      }),
    })
    expect(updated.status).toBe(200)
    expect(await updated.json()).toEqual({
      view,
      routine: { id: 'routine-one', name: 'Morning summary', pullRequest },
      baseBranch: 'feature/review',
    })
    expect(
      await h.env.DB.prepare('SELECT base_branch FROM workspaces WHERE id = ?')
        .bind(id)
        .first('base_branch'),
    ).toBe('feature/review')
  },
)
