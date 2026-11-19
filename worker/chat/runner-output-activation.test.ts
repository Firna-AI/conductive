import { afterAll, beforeAll, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { answerOutputStream } from './output-answer-key'
import { outputFixture } from './runner-output.test-support'
import { answerState, shownAnswer } from './runner-output-symbolic.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('promotes all released contexts once on activation and again after a legacy rollback write', async () => {
  const f = await outputFixture(harness, { TOKEN: 'private-value' })
  const complete = (messageId: string) =>
    f.emit({
      type: 'assistant.completed',
      ...f.context,
      messageId,
      text: 'private-',
      userMessageIds: [f.messageId],
    })
  const formats = async () =>
    (await answerState(f))
      .flat()
      .map((held) => [
        held.event.messageId,
        held.symbolic ? 'symbolic' : 'legacy',
      ])
      .sort(([left], [right]) => left.localeCompare(right))
  const ciphertexts = (ids: string[]) =>
    f.chat.store.read(WORKSPACE_ID, (view) =>
      Promise.all(
        ids.map((messageId) =>
          view.output.read(answerOutputStream({ ...f.context, messageId })),
        ),
      ),
    )
  await complete('activation-first')
  await complete('activation-second')
  expect(await formats()).toEqual([
    ['activation-first', 'legacy'],
    ['activation-second', 'legacy'],
  ])
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  await f.emit({ type: 'workspace.title', name: 'ordinary title' })
  expect(await formats(), 'activation promotes every released answer').toEqual([
    ['activation-first', 'symbolic'],
    ['activation-second', 'symbolic'],
  ])
  expect(JSON.stringify(await answerState(f))).not.toContain('private-value')
  const originals = ['activation-first', 'activation-second']
  const promoted = await ciphertexts(originals)
  await f.emit({ type: 'workspace.title', name: 'another ordinary title' })
  expect(await ciphertexts(originals), 'steady ON skips the full pass').toEqual(
    promoted,
  )
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'false' })
  await complete('rollback-new')
  await f.emit({ type: 'workspace.title', name: 'rollback title' })
  expect(await formats()).toEqual([
    ['activation-first', 'symbolic'],
    ['activation-second', 'symbolic'],
    ['rollback-new', 'legacy'],
  ])
  expect(await ciphertexts(originals), 'OFF skips the full pass').toEqual(
    promoted,
  )
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  await f.emit({ type: 'workspace.title', name: 'activation title' })
  expect(await formats(), 'reactivation converts the rollback write').toEqual([
    ['activation-first', 'symbolic'],
    ['activation-second', 'symbolic'],
    ['rollback-new', 'symbolic'],
  ])
  expect(JSON.stringify(await answerState(f))).not.toContain('private-value')
  const all = [...originals, 'rollback-new']
  const reactivated = await ciphertexts(all)
  await f.emit({ type: 'workspace.title', name: 'steady title' })
  expect(await ciphertexts(all)).toEqual(reactivated)
  await f.restart()
  await f.connect(f.runner)
  for (const messageId of all) {
    await f.emit({
      type: 'assistant.delta',
      ...f.context,
      messageId,
      text: 'value!',
    })
    expect(await shownAnswer(f, messageId)).toBe('[redacted]!')
  }
})
