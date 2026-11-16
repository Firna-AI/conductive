import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  automationPath,
  type AutomationResponse,
  type UpdateAutomationRequest,
} from '../../src/shared/automations'
import { createHarness, type TestHarness } from '../test-support/harness'
import { automationFixture } from './routes.test-support'

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
  const fixture = await automationFixture(harness)
  harness.setTime(Date.parse('2026-11-09T08:00:00Z'))
  const automation = await fixture.create({ timeZone: 'UTC' })
  expect(automation.nextRunAt).toBe(Date.parse('2026-11-09T09:00:00Z'))
  const patch = async (body: UpdateAutomationRequest) => {
    const response = await harness.request(
      automationPath(fixture.org.id, automation.id),
      fixture.member.session,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
    expect(response.status).toBe(200)
    const result: AutomationResponse = await response.json()
    return result.automation.nextRunAt
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
