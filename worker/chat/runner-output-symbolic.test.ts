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

it('masks held whole copies after value changes and keeps exact longer and fallback matches', async () => {
  const f = await outputFixture(harness, {})
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  for (const scenario of [
    {
      name: 'removed prefix',
      before: ['short-token', 'short-token-longer'],
      first: 'short-token',
      after: ['short-token-longer'],
      next: '!',
      expected: '[redacted]!',
    },
    {
      name: 'longer completion',
      before: ['short-token', 'short-token-longer'],
      first: 'short-token',
      after: ['short-token-longer'],
      next: '-longer!',
      expected: '[redacted]!',
    },
    {
      name: 'nested fallback',
      before: ['short-token', 'db://user:short-token@host'],
      first: 'db://user:short-token@ho',
      after: ['db://user:short-token@host'],
      next: 'me!',
      expected: 'db://user:[redacted]@home!',
    },
    {
      name: 'complete fallback',
      before: ['🦀token', '🦀token-mid', '🦀token-mid-long'],
      first: '🦀token-mid',
      after: ['🦀token-mid', '🦀token-mid-long'],
      next: '-x!',
      expected: '[redacted]-x!',
    },
    {
      name: 'exact identity',
      before: ['short-token', 'short-token-longer'],
      first: 'short-token',
      after: ['zzzzzzzzzzz-longer'],
      next: '-longer!',
      expected: '[redacted]-longer!',
    },
  ]) {
    await setAnswerValues(f, scenario.before)
    const delta = {
      type: 'assistant.delta' as const,
      ...f.context,
      messageId: scenario.name,
    }
    await f.emit({ ...delta, text: scenario.first })
    const held = JSON.stringify(await answerState(f))
    await setAnswerValues(f, scenario.after)
    await f.emit({ ...delta, text: scenario.next })
    expect(await shownAnswer(f, scenario.name), scenario.name).toBe(
      scenario.expected,
    )
    for (const value of scenario.before)
      expect(
        held,
        `${scenario.name}: saved state contains no whole value`,
      ).not.toContain(value)
  }
})

it('keeps symbolic contexts through OFF rollback, an unrelated event, restart, and cross-stream continuation', async () => {
  const f = await outputFixture(harness, { TOKEN: 'private-value' })
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  const delta = {
    type: 'assistant.delta' as const,
    ...f.context,
    messageId: 'rollback-answer',
  }
  await f.emit({ ...delta, text: 'private-' })
  await f.emit({
    type: 'turn.completed',
    ...f.context,
    state: 'finished',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [f.messageId],
  })
  const saved = JSON.stringify(await answerState(f))
  expect(saved, 'symbolic state has no saved value list').not.toContain(
    'private-value',
  )
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'false' })
  await f.emit({ type: 'workspace.title', name: 'ordinary title' })
  await f.emit({ ...delta, messageId: 'fresh-off-answer', text: 'private-' })
  const mixed = (await answerState(f)).flat()
  expect(
    mixed.find((held) => held.event.messageId === 'fresh-off-answer'),
  ).toMatchObject({
    event: { text: 'private-' },
    secrets: ['private-value'],
  })
  expect(
    mixed.find((held) => held.event.messageId === 'fresh-off-answer')?.symbolic,
  ).toBeUndefined()
  await f.restart()
  const late = await f.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: 'late-symbolic-stream',
    }),
  )
  late.emit({ ...delta, text: 'val' })
  await f.drain()
  await f.restart()
  await f.connect(late)
  late.emit({ ...delta, text: 'ue!' })
  await f.drain()
  expect(await shownAnswer(f, delta.messageId)).toBe('private-[redacted]!')
  expect(
    JSON.stringify(
      (await answerState(f)).flat().filter((held) => held.symbolic),
    ),
  ).not.toContain('private-value')
})

it('keeps the existing complete and split literal marker output', async () => {
  const f = await outputFixture(harness, { TOKEN: 'redacted' })
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  const delta = {
    type: 'assistant.delta' as const,
    ...f.context,
    messageId: 'split-marker',
  }
  await f.emit({ ...delta, text: '[red' })
  await f.emit({ ...delta, text: 'acted]' })
  expect(await shownAnswer(f, delta.messageId)).toBe('[[redacted]]')
  await f.emit({ ...delta, messageId: 'complete-marker', text: '[redacted]' })
  expect(await shownAnswer(f, 'complete-marker')).toBe('[redacted]')
  await setAnswerValues(f, ['reda', '[redacted]-long'])
  await f.emit({ ...delta, messageId: 'held-marker', text: '[redacted]' })
  await setAnswerValues(f, ['[redacted]-long'])
  await f.emit({ ...delta, messageId: 'held-marker', text: '!' })
  expect(await shownAnswer(f, 'held-marker')).toBe('[redacted]!')
})

it('keeps an exact longer continuation after a whole shorter copy crosses a released context', async () => {
  const f = await outputFixture(harness, {})
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  await setAnswerValues(f, ['prefix-short', 'prefix-short-longer'])
  const delta = {
    type: 'assistant.delta' as const,
    ...f.context,
    messageId: 'context-overlap',
  }
  await f.emit({ ...delta, text: 'prefix-' })
  await f.emit({
    type: 'turn.completed',
    ...f.context,
    state: 'finished',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [f.messageId],
  })
  await f.emit({ ...delta, text: 'short' })
  const saved = JSON.stringify(await answerState(f))
  expect(saved).not.toContain('prefix-short')
  await setAnswerValues(f, ['prefix-short-longer'])
  await f.restart()
  await f.connect(f.runner)
  await f.emit({ ...delta, text: '-longer!' })
  expect(await shownAnswer(f, delta.messageId)).toBe('prefix-[redacted]!')
})
