import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { RunnerEvent } from '../../src/shared/runner'
import type { SkillsUpdated } from '../../src/shared/skills'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  createChatFixture,
  WORKSPACE_ID,
  type ChatFixture,
} from './harness.test-support'
import {
  refreshCommands,
  refusedEvents,
  workspaceEvents,
} from './runner-repairs.test-support'

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

function report(description: string): RunnerEvent {
  return {
    type: 'skills.updated',
    claude: [{ name: 'plans', description }],
    codex: [],
  }
}

function list(description: string): SkillsUpdated {
  return {
    type: 'skills.updated',
    skills: { claude: [{ name: 'plans', description }], codex: [] },
  }
}

const unavailable: SkillsUpdated = { type: 'skills.updated', skills: null }

async function skillEvents(fixture: ChatFixture) {
  return (await workspaceEvents(fixture)).filter(
    (event) => event.type === 'skills.updated',
  )
}

it('marks the list unavailable when a runner reaches ready without a skills report since its connect, once, until a report comes', async () => {
  const fixture = await createChatFixture(harness)
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(await skillEvents(fixture)).toEqual([unavailable])
  await fixture.disconnect(runner)
  await fixture.connect(runner)
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(await skillEvents(fixture)).toEqual([unavailable])
  runner.emit(report('First'))
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(await skillEvents(fixture)).toEqual([list('First')])
  await fixture.disconnect(runner)
  await fixture.connect(runner)
  runner.emit(report('After the reconnect'))
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(await skillEvents(fixture)).toEqual([list('After the reconnect')])
  await fixture.disconnect(runner)
  await fixture.restart()
  await fixture.connect(runner)
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(await skillEvents(fixture)).toEqual([unavailable])
})

it('keeps the last list after a refused list over the limit, asks for a fresh report, and shows unavailable when the repair fails', async () => {
  const fixture = await createChatFixture(harness)
  await harness.env.DB.prepare('DELETE FROM agent_logins').run()
  const runner = await fixture.connect()
  runner.emit(report('Kept'))
  runner.emit({
    type: 'skills.updated',
    claude: Array.from({ length: 201 }, (_, index) => ({
      name: `skill-${index}`,
      description: '',
    })),
    codex: [],
  })
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const command = {
    type: 'report.refresh',
    commandId: 'chat-0001',
    kind: 'skills.updated',
  }
  expect(refreshCommands(runner)).toEqual([command])
  expect(await skillEvents(fixture)).toEqual([list('Kept')])
  runner.emit(report('x'.repeat(4097)))
  await fixture.drain()
  expect(refreshCommands(runner)).toEqual([command])
  const marker = {
    type: 'runner.event-refused',
    streamId: 'fake-stream-1',
    runnerEventType: 'skills.updated',
    reason: 'too_large',
    sessionId: null,
    turnId: null,
  }
  expect(await refusedEvents(fixture)).toEqual([
    { ...marker, runnerEventNumber: 2 },
    { ...marker, runnerEventNumber: 4, repairFailed: true },
  ])
  expect(await skillEvents(fixture)).toEqual([unavailable])
  runner.emit(report('Repaired'))
  await fixture.drain()
  expect(await skillEvents(fixture)).toEqual([list('Repaired')])
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.repairs.get('skills.updated'),
    ),
  ).toBeUndefined()
})
