import { expect, it } from 'vitest'

import { heldOperation } from '../test-support/held-operation'
import { createRunnerLimitsFixture } from './runner-limits.test-support'
import { context } from './runner-fixtures.test-support'
import { RUNNER_WORK_WATCH_MS } from './runner-work-watch'

const delta = {
  type: 'assistant.delta',
  ...context,
  messageId: 'answer',
  text: 'hello',
}
const message = JSON.stringify({
  type: 'event',
  streamId: 'stream',
  eventNumber: 1,
  occurredAt: 25,
  event: delta,
})

async function interruptedWarnings(
  fixture: Awaited<ReturnType<typeof createRunnerLimitsFixture>>,
) {
  const calls = await fixture.actor.api.controls.warningCalls()
  return calls
    .flat()
    .filter(
      (value) =>
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        value.kind === 'runner_work_interrupted',
    )
}

/**
 * Holds the event after its commit, resets the object, and connects again.
 * A hold inside a transaction would block the reset call.
 */
async function crashDuringEvent(
  fixture: Awaited<ReturnType<typeof createRunnerLimitsFixture>>,
) {
  const held = heldOperation()
  let holding = true
  await fixture.configure({
    observers: {
      runnerEventStored: async () => {
        if (holding) await held.wait()
      },
    },
  })
  const receipt = fixture.raw(message).catch(() => undefined)
  await held.entered
  await fixture.actor.crash()
  holding = false
  held.release()
  await receipt
  await fixture.actor.api.controls.captureWarnings(true)
  await fixture.connect('stream')
}

it('reports a runner event that an object reset interrupted, once', async () => {
  const fixture = await createRunnerLimitsFixture()
  try {
    await crashDuringEvent(fixture)
    expect(await interruptedWarnings(fixture)).toEqual([
      {
        kind: 'runner_work_interrupted',
        message: 'The work of a runner message did not finish.',
        workspaceId: 'unknown',
        connectionId: 'unknown',
        streamId: 'unknown',
        processStartId: null,
        protocolVersion: 2,
        work: 'event',
        stage: 'after_commit',
        eventType: 'assistant.delta',
        eventNumber: 1,
        size: message.length,
      },
    ])
    await fixture.raw(message)
    await fixture.actor.crash()
    await fixture.actor.api.controls.captureWarnings(true)
    await fixture.connect('stream')
    expect(await interruptedWarnings(fixture)).toEqual([])
  } finally {
    await fixture.actor.api.controls.captureWarnings(false)
  }
})

it('marks no runner work after the watch window of the connection', async () => {
  const fixture = await createRunnerLimitsFixture()
  try {
    await fixture.actor.api.controls.setTime(25 + RUNNER_WORK_WATCH_MS)
    await crashDuringEvent(fixture)
    expect(await interruptedWarnings(fixture)).toEqual([])
  } finally {
    await fixture.actor.api.controls.captureWarnings(false)
  }
})
