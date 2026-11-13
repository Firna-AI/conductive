import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { RunnerEvent } from '../../src/shared/runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { captureEnvironment } from './runner-output.test-support'
import { refusedEvents } from './runner-repairs.test-support'

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

it('filters secrets before it cuts descriptions, keeps only the latest list, streams it to every tab, and replays it after restart', async () => {
  const fixture = await createChatFixture(harness)
  await captureEnvironment(fixture, {
    PASSWORD: { value: 'secretpass', secret: true },
  })
  const first = await fixture.tab()
  const second = await fixture.tab()
  const runner = await fixture.connect()
  runner.emit({
    type: 'skills.updated',
    claude: [{ name: 'plans', description: 'Older list' }],
    codex: [],
  })
  const report: RunnerEvent = {
    type: 'skills.updated',
    claude: [
      {
        name: 'deploy',
        description: `${'a'.repeat(295)}secretpass${'b'.repeat(10)}`,
        manualOnly: true,
      },
      { name: 'secretpass-tool', description: 'A name with a secret' },
      { name: 'plans', description: 'x'.repeat(4096) },
    ],
    codex: [{ name: 'review', description: 'Uses secretpass' }],
  }
  const sent = runner.emit(report)
  await fixture.drain()
  runner.sendEnvelope(sent)
  await fixture.drain()
  const committed = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  expect(committed).toEqual({
    throughEventNumber: 2,
    events: [
      {
        workspaceId: WORKSPACE_ID,
        eventNumber: 2,
        occurredAt: sent.occurredAt,
        event: {
          type: 'skills.updated',
          skills: {
            claude: [
              {
                name: 'deploy',
                description: `${'a'.repeat(295)}[reda`,
                manualOnly: true,
              },
              { name: 'plans', description: 'x'.repeat(300) },
            ],
            codex: [{ name: 'review', description: 'Uses [redacted]' }],
          },
        },
      },
    ],
  })
  for (const tab of [first, second])
    expect(tab.messages.at(-1)).toEqual({
      type: 'event',
      envelope: committed.events[0],
    })
  expect(await fixture.chat.workspaceSummary()).toEqual({
    throughEventNumber: 2,
    lastOutputEventNumber: 0,
    working: false,
  })
  await fixture.restart()
  const replay = await fixture.tab()
  expect(replay.messages).toEqual([{ type: 'history', history: committed }])
  expect(await refusedEvents(fixture)).toEqual([])
  await first.close()
  await second.close()
  await replay.close()
})
