import { afterAll, beforeAll, expect, it } from 'vitest'
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
afterAll(async () => {
  await harness.dispose()
})

it('keeps symbolic held matches encrypted and atomic through failed commits, restart, retry, and replay', async () => {
  const f = await outputFixture(harness, {})
  await f.setEnvironment({ CONDUCTIVE_SYMBOLIC_ANSWER_STATE: 'true' })
  await setAnswerValues(f, ['🦀short-token', 'db://🦀short-token@host'])
  const delta = {
    type: 'assistant.delta' as const,
    ...f.context,
    messageId: 'durable-symbolic',
  }
  await f.setStorageHooks({
    beforeCommit: async (staged) => {
      if (
        (await staged.read(WORKSPACE_ID, (view) =>
          view.cursor('fake-stream-1'),
        )) === 3
      )
        throw new Error('Injected symbolic answer commit failure')
    },
  })
  f.runner.emit({ ...delta, text: 'db://🦀short-token@ho' })
  await expect(f.drain()).rejects.toThrow(
    'Injected symbolic answer commit failure',
  )
  expect(await answerState(f)).toEqual([[]])
  await f.clearFaults()
  await f.connect(f.runner)
  const held = (await answerState(f)).flat()
  expect(held).toHaveLength(1)
  expect(held[0].event.text).toBe('db://[redacted]@ho')
  const symbolic = held.flatMap((held) =>
    held.symbolic ? [held.symbolic] : [],
  )
  expect(symbolic).toHaveLength(1)
  expect(symbolic[0].matches?.runs).toEqual([{ offset: 5, length: 13 }])
  expect(symbolic[0].salt).toMatch(/^[A-Za-z0-9_-]{43}$/)
  const identities =
    symbolic[0].matches?.entries.map((entry) => entry.identity) ?? []
  expect(identities).toHaveLength(2)
  const ciphertext = JSON.stringify([...(await f.snapshot()).records])
  for (const value of [
    '🦀short-token',
    'db://🦀short-token@host',
    symbolic[0].salt,
    ...identities,
  ])
    expect(ciphertext).not.toContain(value)
  expect(JSON.stringify(held)).not.toContain('🦀short-token')
  await setAnswerValues(f, ['db://🦀short-token@host'])
  await f.restart()
  await f.connect(f.runner)
  await f.setStorageHooks({
    beforeCommit: async (staged) => {
      if (
        (await staged.read(WORKSPACE_ID, (view) =>
          view.cursor('fake-stream-1'),
        )) === 4
      )
        throw new Error('Injected symbolic answer continuation failure')
    },
  })
  const final = f.runner.emit({ ...delta, text: 'st!' })
  await expect(f.drain()).rejects.toThrow(
    'Injected symbolic answer continuation failure',
  )
  expect(await answerState(f)).toEqual([[], held])
  await f.clearFaults()
  await f.connect(f.runner)
  f.runner.sendEnvelope(final)
  await f.drain()
  expect(await shownAnswer(f, delta.messageId)).toBe('[redacted]!')
  expect(f.runner.pendingEvents()).toEqual([])
  const publicState = JSON.stringify(await f.history(f.context.sessionId))
  for (const value of [symbolic[0].salt, ...identities])
    expect(publicState).not.toContain(value)
})
