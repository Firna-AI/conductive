import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { answerOutputStream } from './output-answer-key'
import { readOutputSnapshot, saveOutputSnapshot } from './output-filter-records'
import { releasedOutput, unreleasedOutput } from './output-filter-snapshot'
import { outputFixture } from './runner-output.test-support'
import { shownAnswer } from './runner-output-symbolic.test-support'

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

it('updates only the named answer and preserves pending text when its stream aliases an answer record', async () => {
  const f = await outputFixture(harness, { TOKEN: 'private-value' })
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  const first = { ...f.context, messageId: 'first-answer' }
  const second = { ...f.context, messageId: 'second-answer' }
  const firstStream = await answerOutputStream(f.env, WORKSPACE_ID, first)
  const complete = {
    type: 'assistant.completed' as const,
    text: 'private-',
    userMessageIds: [f.messageId],
  }
  await f.emit({ ...complete, ...first })
  const saved = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.output.read(firstStream),
  )
  expect(saved, 'the answer has its own encrypted context').toEqual(
    expect.any(String),
  )
  expect(JSON.stringify(f.runner.received)).not.toContain(firstStream)
  expect(JSON.stringify(await f.history(f.context.sessionId))).not.toContain(
    firstStream,
  )
  await f.emit({ ...complete, ...second })
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.read(firstStream),
    ),
    'an unrelated answer does not rewrite the saved context',
  ).toBe(saved)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.output.readContexts()),
  ).toBeUndefined()
  const alias = await f.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: firstStream,
    }),
  )
  alias.emit({ type: 'assistant.delta', ...second, text: 'val' })
  await f.drain()
  await f.restart()
  await f.connect(alias)
  alias.emit({ type: 'assistant.delta', ...first, text: 'value!' })
  await f.drain()
  await f.restart()
  await f.connect(alias)
  alias.emit({ type: 'assistant.delta', ...second, text: 'ue!' })
  await f.drain()
  expect(await shownAnswer(f, first.messageId)).toBe('[redacted]!')
  expect(await shownAnswer(f, second.messageId)).toBe('[redacted]!')
  expect(alias.pendingEvents()).toEqual([])
})

it('rebuilds an old workspace snapshot atomically even after the answer index was created', async () => {
  const f = await outputFixture(harness, { TOKEN: 'private-value' })
  const first = { ...f.context, messageId: 'rebuild-first' }
  const second = { ...f.context, messageId: 'rebuild-second' }
  const secondStream = await answerOutputStream(f.env, WORKSPACE_ID, second)
  for (const answer of [first, second])
    await f.emit({
      type: 'assistant.completed',
      ...answer,
      text: 'private-',
      userMessageIds: [f.messageId],
    })
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const contexts = []
    const active = new Set(['private-value'])
    for (const stream of [null, ...(await view.output.streams())]) {
      const snapshot = await readOutputSnapshot(
        f.env,
        view,
        WORKSPACE_ID,
        stream,
      )
      contexts.push(...releasedOutput(snapshot))
      if (stream !== null)
        await saveOutputSnapshot(
          f.env,
          view,
          WORKSPACE_ID,
          stream,
          unreleasedOutput(snapshot),
          active,
          active,
        )
    }
    await saveOutputSnapshot(
      f.env,
      view,
      WORKSPACE_ID,
      null,
      contexts,
      active,
      active,
    )
  })
  const oldState = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.output.readContexts(),
  )
  await f.failNextCommit('before', 'Injected answer index rebuild failure')
  const late = f.runner.emit({
    type: 'assistant.delta',
    ...first,
    text: 'value!',
  })
  await expect(f.drain()).rejects.toThrow(
    'Injected answer index rebuild failure',
  )
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.output.readContexts()),
  ).toBe(oldState)
  await f.clearFaults()
  await f.connect(f.runner)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.output.readContexts()),
    'a previous Worker snapshot triggers index recovery',
  ).toBeUndefined()
  const savedSecond = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.output.read(secondStream),
  )
  expect(savedSecond).toEqual(expect.any(String))
  await f.restart()
  await f.connect(f.runner)
  f.runner.sendEnvelope(late)
  await f.drain()
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.read(secondStream),
    ),
  ).toBe(savedSecond)
  await f.emit({ type: 'assistant.delta', ...second, text: 'value!' })
  expect(await shownAnswer(f, first.messageId)).toBe('[redacted]!')
  expect(await shownAnswer(f, second.messageId)).toBe('[redacted]!')
  expect(f.runner.pendingEvents()).toEqual([])
})
