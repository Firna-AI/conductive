import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const STREAM_ID = '12345678-1234-4234-8234-123456789abc'

it('names the stage of a failed runner message in its warning', async () => {
  const fixture = await createChatFixture(harness)
  const connect = async () => {
    const runner = await fixture.connect(
      new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: STREAM_ID }),
    )
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    return runner
  }
  await fixture.actor.api.controls.captureWarnings(true)
  try {
    const malformed = await connect()
    malformed.sendEnvelope({ type: 'event' } as unknown as RunnerEventEnvelope)
    await fixture.drain().catch(() => undefined)
    const mismatched = await connect()
    const envelope = mismatched.emit({ type: 'runner.ready' })
    await fixture.drain()
    mismatched.sendEnvelope({
      ...envelope,
      streamId: '87654321-4321-4321-8321-cba987654321',
    })
    await fixture.drain().catch(() => undefined)
    const failed = (await fixture.actor.api.controls.warningCalls())
      .flat()
      .filter(
        (warning): warning is Record<string, unknown> =>
          typeof warning === 'object' &&
          warning !== null &&
          'kind' in warning &&
          warning.kind === 'runner_message_failed',
      )
    expect(failed.map(({ stage, error }) => ({ stage, error }))).toEqual([
      {
        stage: 'parse',
        error: { kind: 'http', status: 400, code: 'invalid_input' },
      },
      {
        stage: 'event',
        error: { kind: 'http', status: 400, code: 'runner_stream_mismatch' },
      },
    ])
  } finally {
    await fixture.actor.api.controls.captureWarnings(false)
    await fixture.chat.closeConnections()
  }
})
