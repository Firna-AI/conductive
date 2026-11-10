import { BYTES, PARTS } from './manifest.test-support'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { importFixture, type ImportFixture } from './service.test-support'
import {
  held,
  immutableKey,
  keysForScope,
  temporaryKey,
} from './storage.test-support'
import { IMPORT_RESERVATION_MS } from './reservation-data'
import { readImportCleanup } from './cleanup-data'

let harness: TestHarness
let fixture: ImportFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await importFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

it('expires from creation, frees the source slot and repeats durable deletion after the final late PUT', async () => {
  await fixture.db
    .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
    .bind(TEST_TIME + 2 * IMPORT_RESERVATION_MS, fixture.actor.sessionId)
    .run()
  await fixture.prepare('reservation', fixture.service)
  await fixture.setTime(TEST_TIME + IMPORT_RESERVATION_MS - 1000)
  const target = await fixture.upload('bundle')
  await fixture.setTime(TEST_TIME + IMPORT_RESERVATION_MS)
  await expect(
    fixture.control({ kind: 'complete', reservationId: 'reservation' }),
  ).rejects.toMatchObject({ code: 'import_expired' })
  expect(await fixture.service.cleanup()).toBe(false)
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    group: 'all',
    finishedAt: null,
    dueAt: target.expiresAt,
  })
  const next = fixture.make('next-reservation')
  expect(
    await next.control(fixture.actor, { kind: 'reserve', row: fixture.source }),
  ).toMatchObject({
    kind: 'reservation',
    reservation: {
      id: 'next-reservation',
      createdAt: TEST_TIME + IMPORT_RESERVATION_MS,
      expiresAt: TEST_TIME + 2 * IMPORT_RESERVATION_MS,
    },
  })
  const bucket = fixture.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2.')
  await bucket.put(temporaryKey(target), BYTES.bundle)
  expect((await keysForScope(bucket, fixture.service.scope)).length).toBe(1)
  await fixture.setTime(target.expiresAt)
  expect(await fixture.make().cleanup()).toBe(true)
  expect(await keysForScope(bucket, fixture.service.scope)).toEqual([])
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    finishedAt: target.expiresAt,
    dueAt: null,
  })
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM workspaces')
      .first('count'),
  ).toBe(0)
})

it('drains a held server seal before prefix deletion and never publishes or recreates the cleaned workspace', async () => {
  const entered = held<void>()
  const release = held<void>()
  const bucket = fixture.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2.')
  const key = immutableKey({ scope: fixture.service.scope, part: PARTS[0] })
  const observed = new Proxy(bucket, {
    get(target, property) {
      if (property === 'put')
        return async (
          name: string,
          value: Parameters<R2Bucket['put']>[1],
          options?: R2PutOptions,
        ) => {
          if (name === key) {
            entered.resolve()
            await release.promise
          }
          return target.put(name, value, options)
        }
      return Reflect.get(target, property, target)
    },
  })
  const service = fixture.make('reservation', { CHAT_ATTACHMENTS: observed })
  await fixture.prepare('reservation', service)
  const target = await fixture.upload('bundle', service)
  const sealing = service.control(fixture.actor, {
    kind: 'verify',
    reservationId: 'reservation',
    partId: 'bundle',
  })
  const rejected = expect(sealing).rejects.toMatchObject({
    code: 'import_unavailable',
  })
  await entered.promise
  const deleting = service.cleanup('all')
  await fixture.db.prepare('SELECT 1').first()
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    firstDeletedAt: null,
    finishedAt: null,
    inFlight: 1,
  })
  release.resolve()
  await rejected
  expect(await deleting).toBe(false)
  expect(await keysForScope(bucket, fixture.service.scope)).toEqual([])
  await fixture.setTime(target.expiresAt)
  expect(await service.cleanup()).toBe(true)
  expect(await bucket.head(key)).toBeNull()
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM workspaces')
      .first('count'),
  ).toBe(0)
})

it('retains failed cleanup after org records disappear and recovers both object groups from its durable owner', async () => {
  await fixture.prepare('reservation', fixture.service)
  await fixture.verifyAll()
  const bucket = fixture.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2.')
  const failing = new Proxy(bucket, {
    get(target, property) {
      if (property === 'delete')
        return async () => {
          throw new Error('Injected delete failure')
        }
      return Reflect.get(target, property, target)
    },
  })
  await fixture.db
    .prepare('DELETE FROM orgs WHERE id = ?')
    .bind(fixture.org.id)
    .run()
  const cleanup = fixture.make('reservation', { CHAT_ATTACHMENTS: failing })
  await expect(cleanup.cleanup('all')).rejects.toThrow(
    'Injected delete failure',
  )
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    orgId: fixture.org.id,
    group: 'all',
    finishedAt: null,
  })
  await fixture.setTime(TEST_TIME + 300_000)
  expect(await fixture.make().cleanup()).toBe(true)
  expect(await keysForScope(bucket, fixture.service.scope)).toEqual([])
})

it('recovers an admitted seal after reconstruction before it releases durable cleanup ownership', async () => {
  const bucket = fixture.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2.')
  const key = immutableKey({ scope: fixture.service.scope, part: PARTS[0] })
  const uncertain = new Proxy(bucket, {
    get(target, property) {
      if (property === 'put')
        return async (
          name: string,
          value: Parameters<R2Bucket['put']>[1],
          options?: R2PutOptions,
        ) => {
          const result = await target.put(name, value, options)
          if (name === key) throw new Error('The seal response was lost.')
          return result
        }
      return Reflect.get(target, property, target)
    },
  })
  const service = fixture.make('reservation', { CHAT_ATTACHMENTS: uncertain })
  await fixture.prepare('reservation', service)
  const target = await fixture.upload('bundle', service)
  await expect(
    service.control(fixture.actor, {
      kind: 'verify',
      reservationId: 'reservation',
      partId: 'bundle',
    }),
  ).rejects.toThrow('The seal response was lost.')
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    inFlight: 1,
    finishedAt: null,
  })
  await fixture.setTime(target.expiresAt)
  expect(await fixture.make().cleanup('all')).toBe(true)
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    inFlight: 0,
    finishedAt: target.expiresAt,
  })
  expect(await keysForScope(bucket, fixture.service.scope)).toEqual([])
  expect(
    await fixture.db
      .prepare(
        "SELECT id FROM conductor_import_reservations WHERE id = 'reservation'",
      )
      .first(),
  ).toBeNull()
})
