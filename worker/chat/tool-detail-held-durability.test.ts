import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { outputFixture } from './runner-output.test-support'
import { part, sourceRecords } from './tool-detail.test-support'
import { workspaceSecretValuePath } from '../../src/shared/secret-requests'
import {
  readHeldTool,
  readHeldSource,
  saveHeldTemporary,
  setHeldValues,
} from './tool-detail-held.test-support'

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

it('keeps symbolic non-BMP matches encrypted and atomic through cleanup rollback, restart, final cut and replay', async () => {
  const f = await outputFixture(harness, {})
  await setHeldValues(f, ['db://🦀short-token@host'])
  await saveHeldTemporary(f, '🦀short-token')
  const prefix = '"'.repeat(32760) + '🦀'
  const first = await f.emit(
    part(f.context, prefix + 'db://🦀short-token@ho', 1),
  )
  const before = (await f.snapshot()).records
  await f.setStorageHooks({
    beforeCommit: async (staged) => {
      const remaining = await staged.read(WORKSPACE_ID, (view) =>
        view.secrets.values(),
      )
      if (!remaining.length)
        throw new Error('Injected symbolic cleanup rollback')
    },
  })
  const path = workspaceSecretValuePath(
    f.org.id,
    WORKSPACE_ID,
    'held-temporary',
  )
  expect((await f.fetch(path, undefined, f.ownerCookie, 'DELETE')).status).toBe(
    500,
  )
  expect(sourceRecords((await f.snapshot()).records)).toEqual(
    sourceRecords(before),
  )
  expect((await readHeldTool(f))?.held).toBe('db://🦀short-token@ho')
  await f.clearFaults()
  expect((await f.fetch(path, undefined, f.ownerCookie, 'DELETE')).status).toBe(
    204,
  )
  const cleaned = await readHeldTool(f)
  expect.soft(cleaned?.held).toBe('db://[redacted]@ho')
  expect.soft(JSON.stringify(cleaned)).not.toContain('🦀short-token')
  const retained = await readHeldSource(f)
  expect(retained.text).toBe(prefix)
  expect(JSON.stringify(retained)).not.toContain('🦀short-token')
  expect(cleaned?.heldMatches?.runs).toEqual([{ offset: 5, length: 13 }])
  const identities =
    cleaned?.heldMatches?.entries.map((entry) => entry.identity) ?? []
  expect(identities).toHaveLength(1)
  expect(cleaned?.matchSalt).toMatch(/^[A-Za-z0-9_-]{43}$/)
  const saved = (await f.snapshot()).records
  const stored = JSON.stringify([...saved])
  expect(stored).not.toContain('🦀short-token')
  expect(stored).not.toContain(cleaned?.matchSalt)
  for (const identity of identities) expect(stored).not.toContain(identity)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.toolContext('fake-stream-1'),
    ),
  ).toEqual(f.context)
  await f.restart()
  await f.connect(f.runner)
  f.runner.sendEnvelope(first)
  await f.drain()
  expect(await readHeldTool(f)).toEqual(cleaned)
  await f.setStorageHooks({
    beforeCommit: async (staged) => {
      const cursor = await staged.read(WORKSPACE_ID, (view) =>
        view.cursor('fake-stream-1'),
      )
      if (cursor === 4) throw new Error('Injected symbolic final rollback')
    },
  })
  const final = f.runner.emit(part(f.context, 'st|ordinary🦀\n"', 2, true))
  await expect(f.drain()).rejects.toThrow('Injected symbolic final rollback')
  expect(await readHeldTool(f)).toEqual(cleaned)
  expect(sourceRecords((await f.snapshot()).records)).toEqual(
    sourceRecords(saved),
  )
  await f.clearFaults()
  await f.connect(f.runner)
  f.runner.sendEnvelope(final)
  await f.drain()
  const history = await f.history(f.context.sessionId)
  const tools = history.events.filter(
    ({ event }) => event.type === 'tool.updated',
  )
  expect(tools).toHaveLength(1)
  expect(tools[0]?.event).toMatchObject({
    type: 'tool.updated',
    tool: { detail: prefix + '[redacted]', omittedDetailBytes: 32 },
  })
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
  expect(await readHeldTool(f)).toBeUndefined()
  const replay = await f.tab()
  const publicState = JSON.stringify([history, replay.messages])
  expect(publicState).not.toContain(cleaned?.matchSalt)
  for (const identity of identities) expect(publicState).not.toContain(identity)
  expect(
    replay.messages
      .flatMap((message) =>
        message.type === 'history' ? message.history.events : [],
      )
      .filter(({ event }) => event.type === 'tool.updated'),
  ).toEqual(tools)
  for (const field of [
    'matchSalt',
    'commitment',
    'heldMatches',
    'sourceGeneration',
  ])
    expect(JSON.stringify(history)).not.toContain(field)
  await replay.close()
})
