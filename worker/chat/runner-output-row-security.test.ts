import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { answerOutputStream } from './output-answer-key'
import { outputFixture } from './runner-output.test-support'
import {
  rawAnswerRow,
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
  {
    name: 'legacy held text during activation',
    control: 'false',
    initialShortActive: true,
    trigger: 'activation',
    savedLists: [[], []],
  },
  {
    name: 'symbolic held text after a value becomes active',
    control: 'true',
    initialShortActive: false,
    trigger: 'answer',
    savedLists: [[]],
  },
] as const)(
  'protects $name in a rewritten foreign row and masks the ended copy after restart',
  async ({ control, initialShortActive, trigger, savedLists }) => {
    const f = await outputFixture(harness, {})
    await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: control })
    const short = 'row-short-value'
    const longer = short + '-longer'
    await setAnswerValues(f, initialShortActive ? [short, longer] : [longer])
    const first = { ...f.context, messageId: 'row-owner' }
    const second = { ...f.context, messageId: 'foreign-held' }
    await f.emit({
      type: 'assistant.completed',
      ...first,
      text: 'row-',
      userMessageIds: [f.messageId],
    })
    const streamId = await answerOutputStream(f.env, WORKSPACE_ID, first)
    const alias = await f.connect(
      new FakeRunner({ workspaceId: WORKSPACE_ID, streamId }),
    )
    alias.emit({ type: 'assistant.delta', ...second, text: short })
    await f.drain()
    const before = await rawAnswerRow(f, streamId)
    expect(before.entries).toHaveLength(2)
    expect(before.plaintext).toContain(short)
    await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
    await setAnswerValues(f, [short, longer])
    await f.connect(f.runner)
    if (trigger === 'activation')
      await f.emit({ type: 'workspace.title', name: 'ordinary title' })
    else await f.emit({ type: 'assistant.delta', ...first, text: 'zzz' })
    const saved = await rawAnswerRow(f, streamId)
    expect(saved.ciphertext, 'the foreign physical row was rewritten').not.toBe(
      before.ciphertext,
    )
    expect(
      saved.plaintext,
      'new ON ciphertext holds no whole active value',
    ).not.toContain(short)
    expect(saved.entries.map((held) => held.secrets)).toEqual(savedLists)
    expect(saved.entries.every((held) => held.symbolic !== undefined)).toBe(
      true,
    )
    await setAnswerValues(f, [longer])
    await f.restart()
    await f.connect(alias)
    alias.emit({ type: 'assistant.delta', ...second, text: '!' })
    await f.drain()
    expect(await shownAnswer(f, second.messageId)).toBe('[redacted]!')
    expect(alias.pendingEvents()).toEqual([])
  },
)
