import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { importFixture, type ImportFixture } from './service.test-support'
import {
  advertised,
  LFS_OBJECTS,
  lfsResponse,
  prepareLfs,
} from './lfs.test-support'

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

it('fails the entire LFS control safely for unavailable, malformed or ambiguous provider replies', async () => {
  const input = await prepareLfs(fixture)
  const first = advertised(LFS_OBJECTS[0])
  const second = advertised(LFS_OBJECTS[1])
  const malformed = (value: unknown) => () => lfsResponse([first, value])
  const action = (download: unknown) =>
    malformed({ ...second, actions: { download } })
  const cases: { name: string; response: () => Response }[] = [
    {
      name: 'wrong OID',
      response: malformed({ ...second, oid: 'f'.repeat(64) }),
    },
    { name: 'wrong size', response: malformed({ ...second, size: 1 }) },
    { name: 'duplicate OID', response: malformed(first) },
    { name: 'missing object', response: () => lfsResponse([first]) },
    {
      name: 'unexpected object',
      response: () => lfsResponse([first, second, advertised(LFS_OBJECTS[2])]),
    },
    {
      name: 'missing action',
      response: malformed({ oid: second.oid, size: second.size }),
    },
    {
      name: 'conflicting action and error',
      response: malformed({
        ...second,
        error: { code: 404, message: 'private-upstream-body' },
      }),
    },
    {
      name: 'object auth failure',
      response: malformed({
        oid: second.oid,
        size: second.size,
        error: { code: 401, message: 'private-upstream-body' },
      }),
    },
    {
      name: 'nonboolean auth',
      response: malformed({ ...second, authenticated: 'yes' }),
    },
    {
      name: 'HTTP action',
      response: action({ href: 'http://private.example.test/object' }),
    },
    {
      name: 'action URL credentials',
      response: action({ href: 'https://secret@private.example.test/object' }),
    },
    {
      name: 'action fragment',
      response: action({ href: 'https://private.example.test/object#secret' }),
    },
    { name: 'malformed URL', response: action({ href: '/private/object' }) },
    {
      name: 'nonstring header',
      response: action({
        ...second.actions.download,
        header: { Authorization: 1 },
      }),
    },
    {
      name: 'malformed header',
      response: action({
        ...second.actions.download,
        header: { 'invalid header': 'secret' },
      }),
    },
    {
      name: 'expired relative action',
      response: action({ ...second.actions.download, expires_in: 0 }),
    },
    {
      name: 'fractional relative expiry',
      response: action({ ...second.actions.download, expires_in: 0.5 }),
    },
    {
      name: 'expired absolute action',
      response: action({
        href: second.actions.download.href,
        expires_at: '2000-01-01T00:00:00Z',
      }),
    },
    {
      name: 'malformed absolute expiry',
      response: action({
        href: second.actions.download.href,
        expires_at: '2100',
      }),
    },
    {
      name: 'wrong transfer',
      response: () => lfsResponse([first, second], { transfer: 'custom' }),
    },
    {
      name: 'wrong hash',
      response: () => lfsResponse([first, second], { hash_algo: 'sha1' }),
    },
    {
      name: 'nonobject JSON',
      response: () => lfsResponse([], { objects: null }),
    },
    {
      name: 'invalid JSON',
      response: () =>
        new Response('private-upstream-body', {
          headers: { 'Content-Type': 'application/vnd.git-lfs+json' },
        }),
    },
    {
      name: 'wrong media type',
      response: () => Response.json({ objects: [first, second] }),
    },
    ...[401, 403, 404, 429, 307].map((status) => ({
      name: `HTTP ${status}`,
      response: () =>
        new Response('private-upstream-body', {
          status,
          headers: { Location: 'https://private.example.test/secret' },
        }),
    })),
    {
      name: 'network failure',
      response: () => {
        throw new Error('private-upstream-body github-test-token')
      },
    },
  ]
  for (const entry of cases) {
    fixture.dependencies.fetch = async () => entry.response()
    await expect(
      fixture.control({ ...input, objects: LFS_OBJECTS.slice(0, 2) }),
      entry.name,
    ).rejects.toMatchObject({
      status: 502,
      code: 'github_unavailable',
      message: 'GitHub is not available. Try again.',
    })
  }
  fixture.dependencies.fetch = async () =>
    lfsResponse([first, second], { transfer: undefined, hash_algo: undefined })
  expect(
    await fixture.control({ ...input, objects: LFS_OBJECTS.slice(0, 2) }),
  ).toEqual({
    kind: 'repository.lfs',
    factsId: input.factsId,
    available: LFS_OBJECTS.slice(0, 2),
    missing: [],
  })
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM conductor_import_proofs')
      .first('count'),
  ).toBe(1)
  expect(
    await fixture.db
      .prepare('SELECT state FROM conductor_import_reservations')
      .first('state'),
  ).toBe('open')
})
