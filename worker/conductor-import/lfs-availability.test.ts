import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { ImportLfsObject } from '../../src/shared/conductor-import-lfs.ts'
import { createHarness, type TestHarness } from '../test-support/harness'
import { importFixture, type ImportFixture } from './service.test-support'
import { importReader } from './member.test-support'
import { held } from './storage.test-support'
import {
  advertised,
  LFS_ENDPOINT,
  LFS_OBJECTS,
  lfsCandidates,
  lfsObjects,
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

it('classifies matching reordered LFS advertisements and explicit absence without downloading or recording receipts', async () => {
  const input = await prepareLfs(fixture)
  const calls: {
    url: string
    method: string
    redirect: string
    headers: Headers
    body: unknown
  }[] = []
  fixture.dependencies.fetch = async (request) => {
    calls.push({
      url: request.url,
      method: request.method,
      redirect: request.redirect,
      headers: request.headers,
      body: await request.json(),
    })
    return lfsResponse(
      [
        {
          oid: 'c'.repeat(64),
          size: 456,
          error: { code: 410, message: 'private-upstream-body' },
        },
        advertised(LFS_OBJECTS[0]),
        {
          oid: 'b'.repeat(64),
          size: 0,
          error: { code: 404, message: 'private-upstream-body' },
        },
      ],
      { privateBody: 'private-upstream-body' },
    )
  }
  expect(await fixture.control(input)).toEqual({
    kind: 'repository.lfs',
    factsId: input.factsId,
    available: [{ oid: 'a'.repeat(64), sizeBytes: 123 }],
    missing: [
      { oid: 'b'.repeat(64), sizeBytes: 0 },
      { oid: 'c'.repeat(64), sizeBytes: 456 },
    ],
  })
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    url: LFS_ENDPOINT,
    method: 'POST',
    redirect: 'manual',
    body: {
      operation: 'download',
      transfers: ['basic'],
      hash_algo: 'sha256',
      objects: [
        { oid: 'a'.repeat(64), size: 123 },
        { oid: 'b'.repeat(64), size: 0 },
        { oid: 'c'.repeat(64), size: 456 },
      ],
    },
  })
  expect(Object.fromEntries(calls[0].headers)).toEqual({
    accept: 'application/vnd.git-lfs+json',
    authorization: `Basic ${btoa('x-access-token:github-test-token')}`,
    'content-type': 'application/vnd.git-lfs+json',
    'user-agent': 'Conductive',
  })
  expect(
    await fixture.db
      .prepare(
        "SELECT COUNT(*) AS count FROM conductor_import_proofs WHERE kind = 'prerequisites'",
      )
      .first('count'),
  ).toBe(0)
  expect(
    await fixture.db
      .prepare(
        'SELECT COUNT(*) AS count FROM conductor_import_verified_prerequisites',
      )
      .first('count'),
  ).toBe(0)
  expect(
    await fixture.db
      .prepare(
        'SELECT snapshot_json AS snapshot,manifest_closed AS closed,state FROM conductor_import_reservations',
      )
      .first(),
  ).toEqual({ snapshot: null, closed: 0, state: 'open' })
})

it('processes every candidate through bounded provider batches before returning a complete LFS page', async () => {
  const input = await prepareLfs(fixture)
  const objects = lfsObjects(256)
  const calls: ImportLfsObject[][] = []
  fixture.dependencies.fetch = async (request) => {
    const candidates = await lfsCandidates(request)
    calls.push(candidates)
    return lfsResponse(candidates.map(advertised).reverse())
  }
  expect(await fixture.control({ ...input, objects })).toEqual({
    kind: 'repository.lfs',
    factsId: input.factsId,
    available: objects,
    missing: [],
  })
  expect(calls.map((batch) => batch.length)).toEqual([100, 100, 56])
  expect(calls.flat()).toEqual(objects)
})

it('withholds LFS classifications when membership or the chosen repository changes during a provider read', async () => {
  await importReader(fixture)
  const input = await prepareLfs(fixture)
  const objects = lfsObjects(256)
  for (const revoked of ['membership', 'repository'] as const) {
    const entered = held<void>()
    const release = held<void>()
    let calls = 0
    fixture.dependencies.fetch = async (request) => {
      calls += 1
      const candidates = await lfsCandidates(request)
      entered.resolve()
      await release.promise
      return lfsResponse(candidates.map(advertised))
    }
    const pending = fixture.control({ ...input, objects })
    const rejected = expect(pending, revoked).rejects.toMatchObject(
      revoked === 'membership'
        ? {
            status: 403,
            code: 'import_forbidden',
            message: 'The import is not available.',
          }
        : {
            status: 409,
            code: 'import_unavailable',
            message: 'The import is not available. Scan again.',
          },
    )
    await entered.promise
    if (revoked === 'membership')
      await fixture.db
        .prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?')
        .bind(fixture.actor.orgId, fixture.actor.userId)
        .run()
    else
      await fixture.db
        .prepare(
          "UPDATE repositories SET selected = 0 WHERE id = 'import-repo'",
        )
        .run()
    release.resolve()
    await rejected
    expect(calls, revoked).toBe(1)
    if (revoked === 'membership')
      await fixture.db
        .prepare(
          "INSERT INTO org_members (org_id,user_id,role,joined_at) VALUES (?,?,'admin',?)",
        )
        .bind(
          fixture.actor.orgId,
          fixture.actor.userId,
          fixture.dependencies.now(),
        )
        .run()
    else
      await fixture.db
        .prepare(
          "UPDATE repositories SET selected = 1 WHERE id = 'import-repo'",
        )
        .run()
  }
  fixture.dependencies.fetch = async () => {
    throw new Error('No provider call may follow a facts mismatch.')
  }
  await expect(
    fixture.control({ ...input, factsId: 'another-reservations-facts' }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  await fixture.db
    .prepare(
      "UPDATE repositories SET github_repository_id = 18 WHERE id = 'import-repo'",
    )
    .run()
  await expect(fixture.control(input)).rejects.toMatchObject({
    code: 'import_unavailable',
  })
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM conductor_import_proofs')
      .first('count'),
  ).toBe(1)
  expect(
    await fixture.db
      .prepare(
        'SELECT snapshot_json AS snapshot,state FROM conductor_import_reservations',
      )
      .first(),
  ).toEqual({ snapshot: null, state: 'open' })
})
