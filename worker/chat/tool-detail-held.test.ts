import { afterAll, beforeAll, beforeEach, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { outputFixture } from './runner-output.test-support'
import { heldScenario } from './tool-detail-held.test-support'

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

it('erases removed held copies and preserves complete and incomplete remaining matches', async () => {
  const f = await outputFixture(harness, {})
  for (const scenario of [
    {
      name: 'divergence',
      first: 'x short-token',
      removed: 'short-token',
      remaining: ['short-token-longer'],
      held: '[redacted]',
      final: '!',
      expected: 'x [redacted]!',
    },
    {
      name: 'completion',
      first: 'x short-token',
      removed: 'short-token',
      remaining: ['short-token-longer'],
      held: '[redacted]',
      final: '-longer|',
      expected: 'x [redacted]|',
    },
    {
      name: 'nested divergence',
      first: 'x db://user:short-token@ho',
      removed: 'short-token',
      remaining: ['db://user:short-token@host'],
      held: 'db://user:[redacted]@ho',
      final: 'me|',
      expected: 'x db://user:[redacted]@home|',
    },
    {
      name: 'complete fallback',
      first: 'x short-token-mid',
      removed: 'short-token',
      remaining: ['short-token-mid', 'short-token-mid-long'],
      held: '[redacted]-mid',
      final: '-x|',
      expected: 'x [redacted]-x|',
    },
    {
      name: 'non-BMP fallback',
      first: 'x 🦀token-mid',
      removed: '🦀token',
      remaining: ['🦀token-mid', '🦀token-mid-long'],
      held: '[redacted]-mid',
      final: '-x|',
      expected: 'x [redacted]-x|',
    },
    {
      name: 'second cleanup preserves longer identity',
      first: 'x short-token-mid',
      removed: 'short-token',
      remaining: ['short-token-mid', 'short-token-mid-long'],
      held: '[redacted]-mid',
      removeNext: 'short-token-mid',
      nextHeld: '[redacted]',
      final: '-long|',
      expected: 'x [redacted]|',
    },
    {
      name: 'second cleanup erases complete fallback',
      first: 'x short-token-mid',
      removed: 'short-token',
      remaining: ['short-token-mid', 'short-token-mid-long'],
      held: '[redacted]-mid',
      removeNext: 'short-token-mid',
      nextHeld: '[redacted]',
      final: '!',
      expected: 'x [redacted]!',
    },
    {
      name: 'full erasure beyond complete fallback',
      first: 'x abcd',
      removed: 'bcd',
      remaining: ['abc', 'abcde'],
      held: 'a[redacted]',
      final: '!',
      expected: 'x [redacted][redacted]!',
    },
  ])
    await heldScenario(f, scenario)
})

it('uses each exact identity at its offset through replacements and starts inside removed runs', async () => {
  const f = await outputFixture(harness, {})
  for (const scenario of [
    {
      name: 'S15 equal-length replacement',
      first: 'x short-token',
      removed: 'short-token',
      remaining: ['short-token-longer'],
      held: '[redacted]',
      later: ['zzzzzzzzzzz-longer'],
      final: '-longer|',
      expected: 'x [redacted]-longer|',
    },
    {
      name: 'S16 middle replacement',
      first: 'x short-token',
      removed: 'short-token',
      remaining: ['short-token-longer'],
      held: '[redacted]',
      middle: '-lon',
      later: ['zzzzzzzzzzz-longer'],
      final: 'ger|',
      expected: 'x [redacted]-longer|',
    },
    {
      name: 'S22 inner start',
      first: 'q xx-short-token-y',
      removed: 'short-token',
      remaining: ['xx-short-token-yz', 'ort-token-yw'],
      held: 'xx-[redacted]-y',
      final: 'w|',
      expected: 'q xx-[redacted][redacted]|',
    },
    {
      name: 'S24 inner start across save',
      first: 'q xx-short-token-y',
      removed: 'short-token',
      remaining: ['xx-short-token-yz', 'ort-token-ywv'],
      held: 'xx-[redacted]-y',
      middle: 'w',
      final: 'v|',
      expected: 'q xx-[redacted][redacted]|',
    },
    {
      name: 'S25 exact admission',
      first: 'x [',
      removed: '[',
      remaining: ['zredacted]x'],
      held: '[redacted]',
      final: 'redacted]x|',
      expected: 'x [redacted]x|',
    },
  ])
    await heldScenario(f, scenario)
})
