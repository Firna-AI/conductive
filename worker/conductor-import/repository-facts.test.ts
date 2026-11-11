import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  importObject,
  importText,
} from '../../src/shared/conductor-import-values.ts'
import { createHarness, type TestHarness } from '../test-support/harness'
import { importFixture, type ImportFixture } from './service.test-support'
import {
  ENTRIES,
  SNAPSHOT,
  SOURCE_HASH,
  SOURCE_HEAD,
} from './manifest.test-support'
import { held } from './storage.test-support'
import { importReader } from './member.test-support'

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

it('verifies prerequisites against current chosen-repository heads with the importer token and persists source-bound proof', async () => {
  const branchHead = 'd'.repeat(40)
  const defaultHead = 'e'.repeat(40)
  const available = 'f'.repeat(40)
  const absent = '9'.repeat(40)
  let changed = false
  let comparisonMismatch: 'base' | 'head' | null = null
  const authorizations: string[] = []
  fixture.dependencies.fetch = async (request: Request) => {
    expect(request.url).toBe('https://api.github.com/graphql')
    authorizations.push(request.headers.get('Authorization') ?? '')
    const body = importObject(await request.json())
    const variables = importObject(body.variables)
    expect(variables.owner).toBe('example')
    expect(variables.name).toBe('repository')
    const query = importText(body.query)
    if (query.includes('ImportRepository'))
      return Response.json({
        data: {
          repository: {
            databaseId: 17,
            nameWithOwner: 'example/repository',
            ref: { target: { oid: branchHead } },
            defaultBranchRef: { name: 'main', target: { oid: defaultHead } },
          },
        },
      })
    const head =
      variables.ref === 'refs/heads/owner/work' ? branchHead : defaultHead
    return Response.json({
      data: {
        repository: {
          databaseId: 17,
          ref: {
            target: { oid: changed ? '8'.repeat(40) : head },
            compare: {
              aheadBy: variables.candidate === available ? 0 : 1,
              baseTarget: {
                oid: comparisonMismatch === 'base' ? '1'.repeat(40) : head,
              },
              headTarget: {
                oid:
                  comparisonMismatch === 'head'
                    ? '2'.repeat(40)
                    : importText(variables.candidate),
              },
            },
          },
        },
      },
    })
  }
  await fixture.control({ kind: 'reserve', row: fixture.source })
  const facts = await fixture.control({
    kind: 'repository.facts',
    reservationId: 'reservation',
  })
  expect(facts).toMatchObject({
    kind: 'repository.facts',
    facts: {
      repositoryId: 17,
      branchHeadOid: branchHead,
      defaultHeadOid: defaultHead,
    },
  })
  if (facts.kind !== 'repository.facts') throw new Error('Missing facts.')
  const input = {
    kind: 'repository.prerequisites' as const,
    reservationId: 'reservation',
    factsId: facts.facts.id,
    sourceFingerprint: SOURCE_HASH,
    headOid: SOURCE_HEAD,
    candidates: [available, absent],
  }
  const proof = await fixture.control(input)
  expect(proof).toMatchObject({
    kind: 'repository.prerequisites',
    verified: [{ oid: available, headOid: branchHead }],
    missing: [absent],
  })
  if (proof.kind !== 'repository.prerequisites')
    throw new Error('Missing proof.')
  await fixture.control({
    kind: 'snapshot',
    reservationId: 'reservation',
    snapshot: { ...SNAPSHOT, recordCount: 16 },
  })
  await fixture.control({
    kind: 'manifest',
    reservationId: 'reservation',
    offset: 0,
    entries: [
      ...ENTRIES,
      { kind: 'prerequisite', oid: available, receiptId: proof.receiptId },
    ],
  })
  expect(
    await fixture.control({
      kind: 'manifest.end',
      reservationId: 'reservation',
    }),
  ).toEqual({ kind: 'accepted' })
  expect(authorizations).toEqual(Array(4).fill('Bearer github-test-token'))
  for (const mismatch of ['base', 'head'] as const) {
    comparisonMismatch = mismatch
    await expect(
      fixture.control(input),
      `mismatched comparison ${mismatch}`,
    ).rejects.toMatchObject({ code: 'github_unavailable' })
  }
  comparisonMismatch = null
  expect(
    await fixture.db
      .prepare(
        'SELECT COUNT(*) AS count FROM conductor_import_verified_prerequisites',
      )
      .first('count'),
  ).toBe(1)
  changed = true
  await expect(fixture.control(input)).rejects.toMatchObject({
    code: 'github_unavailable',
  })
  expect(
    await fixture.db
      .prepare(
        "SELECT COUNT(*) AS count FROM conductor_import_proofs WHERE kind = 'prerequisites'",
      )
      .first('count'),
  ).toBe(1)
})

it('rejects a slow repository result after membership loss without persisting a receipt or returning a credential', async () => {
  await importReader(fixture)
  await fixture.control({ kind: 'reserve', row: fixture.source })
  const entered = held<void>()
  const release = held<void>()
  fixture.dependencies.fetch = async () => {
    entered.resolve()
    await release.promise
    return Response.json({
      data: {
        repository: {
          databaseId: 17,
          nameWithOwner: 'example/repository',
          ref: null,
          defaultBranchRef: null,
        },
      },
    })
  }
  const pending = fixture.control({
    kind: 'repository.facts',
    reservationId: 'reservation',
  })
  const rejected = expect(pending).rejects.toMatchObject({
    code: 'import_forbidden',
    message: 'The import is not available.',
  })
  await entered.promise
  await fixture.db
    .prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(fixture.org.id, fixture.user.id)
    .run()
  release.resolve()
  await rejected
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM conductor_import_proofs')
      .first('count'),
  ).toBe(0)
})
