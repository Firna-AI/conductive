import { expect, it } from 'vitest'

// Temporary: proves that one failed shard fails the Complete gate.
it('fails on purpose', () => {
  expect(1).toBe(2)
})
