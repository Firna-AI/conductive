import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
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
    {
      name: 'generated mask preserves source continuation',
      before: ['a:b', ':bcde'],
      first: 'a:b',
      after: [':bcde'],
      next: 'cde!',
      expected: '[redacted][redacted]!',
    },
    {
      name: 'released source rejects a replacement identity',
      before: ['short-token', 'short-token-longer'],
      first: 'short-token',
      after: ['zzzzzzzzzzz-longer'],
      release: true,
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
    if ('release' in scenario)
      await f.emit({
        type: 'turn.completed',
        ...f.context,
        state: 'finished',
        durationMs: 1,
        files: [],
        omittedFileCount: 0,
        userMessageIds: [f.messageId],
      })
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
