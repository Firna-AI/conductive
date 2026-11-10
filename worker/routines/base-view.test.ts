import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

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

it('returns the resolved workspace base and keeps it out of view writes', async () => {
  const fixture = await runFixture(h)
  await fixture.seedRun()
  await fixture.run(() =>
    startRoutineRun(fixture.runtime, fixture.org.id, 'run-one'),
  )
  const id = await h.env.DB.prepare(
    'SELECT workspace_id FROM routine_runs',
  ).first<string>('workspace_id')
  const path = workspaceViewPath(fixture.org.id, id!)
  const initial = await h.request(path, fixture.session)
  expect(initial.status).toBe(200)
  expect(await initial.json()).toMatchObject({ baseBranch: 'main' })
  await h.env.DB.prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
    .bind('feature/review', id)
    .run()
  const view = { tabs: [], activeTab: null, fileList: 'all', tool: 'terminal' }
  const updated = await h.request(path, fixture.session, {
    method: 'PUT',
    body: JSON.stringify({ ...view, baseBranch: 'foreign/branch' }),
  })
  expect(updated.status).toBe(200)
  expect(await updated.json()).toEqual({
    view,
    routine: { id: 'routine-one', name: 'Morning summary' },
    baseBranch: 'feature/review',
  })
  expect(
    await h.env.DB.prepare('SELECT base_branch FROM workspaces WHERE id = ?')
      .bind(id)
      .first('base_branch'),
  ).toBe('feature/review')
})
