import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  routinePath,
  type RoutineResponse,
  type UpdateRoutineRequest,
} from '../../src/shared/routines'
import { createHarness, type TestHarness } from '../test-support/harness'
import { routineFixture } from './routes.test-support'

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

it('recomputes next times at each save, Active change, and time zone change', async () => {
  const fixture = await routineFixture(harness)
  harness.setTime(Date.parse('2026-11-09T08:00:00Z'))
  const routine = await fixture.create({ timeZone: 'UTC' })
  expect(routine.nextRunAt).toBe(Date.parse('2026-11-09T09:00:00Z'))
  const patch = async (body: UpdateRoutineRequest) => {
    const response = await harness.request(
      routinePath(fixture.org.id, routine.id),
      fixture.member.session,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
    expect(response.status).toBe(200)
    const result: RoutineResponse = await response.json()
    return result.routine.nextRunAt
  }
  harness.setTime(Date.parse('2026-11-10T10:00:00Z'))
  expect(await patch({ name: 'Updated summary' })).toBe(
    Date.parse('2026-11-11T09:00:00Z'),
  )
  expect(await patch({ timeZone: 'America/New_York' })).toBe(
    Date.parse('2026-11-10T14:00:00Z'),
  )
  expect(await patch({ active: false })).toBeNull()
  expect(await patch({ prompt: 'Summarize again.' })).toBeNull()
  harness.setTime(Date.parse('2026-11-10T14:15:00Z'))
  expect(await patch({ active: true })).toBe(Date.parse('2026-11-11T14:00:00Z'))
  expect(
    await patch({ triggers: [{ kind: 'pull-request', event: 'opened' }] }),
  ).toBeNull()
  expect(await patch({ triggers: [] })).toBeNull()
})
