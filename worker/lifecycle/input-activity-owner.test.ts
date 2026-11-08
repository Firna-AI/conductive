import { expect, it } from 'vitest'

import { ManualChatClock } from '../chat/chat-clock.test-support'
import { barrier } from '../previews/stream-test-support'
import { InputActivityOwner } from './input-activity-owner'

function activityFixture(update: (at: number) => Promise<void>) {
  const clock = new ManualChatClock(1_000_000)
  const local: number[] = []
  const updates: number[] = []
  const warnings: string[] = []
  const pending: Promise<void>[] = []
  const owner = new InputActivityOwner({
    now: clock.now,
    schedule: clock.schedule,
    waitUntil: (work) => pending.push(work),
    recordLocal: async (_id, at) => {
      local.push(at)
    },
    update: async (_id, at) => {
      updates.push(at)
      await update(at)
    },
    warn: (message) => warnings.push(message),
  })
  return { clock, local, updates, warnings, pending, owner }
}

it('starts after a quiet minute and coalesces all later input into one trailing update', async () => {
  const fixture = activityFixture(async () => undefined)
  fixture.owner.record('workspace', 1_000_000)
  await fixture.owner.settled()
  expect(fixture.updates).toEqual([1_000_000])
  await fixture.clock.advance(20_000)
  for (let at = 1_020_000; at <= 1_020_003; at++)
    fixture.owner.record('workspace', at)
  await fixture.owner.localSettled()
  expect(fixture.local.at(-1)).toBe(1_020_003)
  expect(fixture.updates).toEqual([1_000_000])
  await fixture.clock.advance(39_999)
  expect(fixture.updates).toEqual([1_000_000])
  await fixture.clock.advance(1)
  await fixture.owner.settled()
  expect(fixture.updates).toEqual([1_000_000, 1_020_003])
  await fixture.clock.advance(120_000)
  fixture.owner.record('workspace', 1_180_000)
  await fixture.owner.settled()
  expect(fixture.updates).toEqual([1_000_000, 1_020_003, 1_180_000])
  expect(fixture.warnings).toEqual([])
  await Promise.all(fixture.pending)
})

it('keeps local input current during a held update and retries after its failure without overlap', async () => {
  const release = barrier<void>()
  let running = 0
  let maximum = 0
  const fixture = activityFixture(async () => {
    running++
    maximum = Math.max(maximum, running)
    try {
      if (fixture.updates.length === 1) {
        await release.promise
        throw new Error('private-provider-error')
      }
      if (fixture.updates.length === 2)
        throw new Error('private-provider-error')
    } finally {
      running--
    }
  })
  fixture.owner.record('workspace', 1_000_000)
  await fixture.owner.localSettled()
  expect(fixture.updates).toEqual([1_000_000])
  await fixture.clock.advance(60_000)
  fixture.owner.record('workspace', 1_060_000)
  fixture.owner.record('workspace', 1_060_001)
  await fixture.owner.localSettled()
  expect(fixture.local.at(-1)).toBe(1_060_001)
  expect(fixture.updates).toEqual([1_000_000])
  release.resolve()
  await fixture.owner.settled()
  expect(fixture.updates).toEqual([1_000_000, 1_060_001])
  expect(maximum).toBe(1)
  expect(fixture.warnings).toEqual([
    'Workspace activity update failed.',
    'Workspace activity update failed.',
  ])
  await fixture.clock.advance(59_999)
  expect(fixture.updates).toEqual([1_000_000, 1_060_001])
  await fixture.clock.advance(1)
  await fixture.owner.settled()
  expect(fixture.updates).toEqual([1_000_000, 1_060_001, 1_060_001])
  expect(maximum).toBe(1)
  await Promise.all(fixture.pending)
})
