import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { outputFixture } from './runner-output.test-support'
import {
  answerState,
  setAnswerValues,
  shownAnswer,
} from './runner-output-symbolic.test-support'

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

it.each([
  { release: 'turn', shorterEnds: false, prefix: '' },
  { release: 'turn', shorterEnds: true, prefix: '' },
  { release: 'refused-completion', shorterEnds: false, prefix: '' },
  { release: 'refused-completion', shorterEnds: true, prefix: 'prefix-' },
] as const)(
  'keeps exact longer matching after $release release when shorterEnds=$shorterEnds',
  async ({ release, shorterEnds, prefix }) => {
    const f = await outputFixture(harness, {})
    await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
    const short = prefix + 'short-token'
    const longer = short + '-longer'
    await setAnswerValues(f, [short, longer])
    const delta = {
      type: 'assistant.delta' as const,
      ...f.context,
      messageId: 'release-answer',
    }
    const end = {
      type: 'turn.completed' as const,
      ...f.context,
      state: 'finished' as const,
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [f.messageId],
    }
    if (prefix) {
      await f.emit({ ...delta, text: prefix })
      await f.emit(end)
    }
    await f.emit({ ...delta, text: 'short-token' })
    await setAnswerValues(f, shorterEnds ? [longer] : [short, longer])
    if (release === 'turn') await f.emit(end)
    else {
      const refused = await f.emit({
        type: 'assistant.completed',
        ...f.context,
        messageId: delta.messageId,
        text: 'Replacement text',
        userMessageIds: ['unavailable-message'],
      })
      expect(
        (await f.history(f.context.sessionId)).events.map(({ event }) => event),
      ).toContainEqual({
        type: 'runner.event-refused',
        streamId: refused.streamId,
        runnerEventNumber: refused.eventNumber,
        runnerEventType: 'assistant.completed',
        reason: 'invalid',
        ...f.context,
      })
    }
    expect(JSON.stringify(await answerState(f))).not.toContain(short)
    await f.restart()
    const late = await f.connect(
      new FakeRunner({
        workspaceId: WORKSPACE_ID,
        streamId: 'late-release-stream',
      }),
    )
    late.emit({ ...delta, text: '-lon' })
    await f.drain()
    await f.restart()
    await f.connect(late)
    late.emit({ ...delta, text: 'ger!' })
    await f.drain()
    expect(await shownAnswer(f, delta.messageId)).toBe(
      prefix + '[redacted][redacted]!',
    )
  },
)

it.each([
  { shorterEnds: false, currentText: '[redacted]' },
  { shorterEnds: true, currentText: 'short-token' },
] as const)(
  'keeps independent completion source matching when shorterEnds=$shorterEnds and uses current values for later completion input',
  async ({ shorterEnds, currentText }) => {
    const f = await outputFixture(harness, {})
    await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
    await setAnswerValues(f, ['short-token', 'short-token-longer'])
    const completion = {
      type: 'assistant.completed' as const,
      ...f.context,
      messageId: 'independent-completion',
      text: 'short-token',
      userMessageIds: [f.messageId],
    }
    await f.emit(completion)
    expect(
      (await f.history(f.context.sessionId)).events.map(({ event }) => event),
    ).toContainEqual({ ...completion, text: '[redacted]' })
    await setAnswerValues(
      f,
      shorterEnds
        ? ['short-token-longer']
        : ['short-token', 'short-token-longer'],
    )
    await f.emit({ ...completion, messageId: 'later-receipt' })
    expect(
      (await f.history(f.context.sessionId)).events.map(({ event }) => event),
    ).toContainEqual({
      ...completion,
      messageId: 'later-receipt',
      text: currentText,
    })
    await f.restart()
    const late = await f.connect(
      new FakeRunner({
        workspaceId: WORKSPACE_ID,
        streamId: 'late-completion-stream',
      }),
    )
    late.emit({
      type: 'assistant.delta',
      ...f.context,
      messageId: completion.messageId,
      text: '-longer!',
    })
    await f.drain()
    expect(await shownAnswer(f, completion.messageId)).toBe('[redacted]!')
  },
)
