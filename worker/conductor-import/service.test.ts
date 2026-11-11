import {
  PARTS,
  SNAPSHOT,
  SOURCE_HASH,
  SOURCE_HEAD,
} from './manifest.test-support'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { workspacesPath } from '../../src/shared/workspaces'
import {
  conductorOldDocumentPath,
  conductorOldDocumentsPath,
} from '../../src/shared/conductor-import.ts'
import { readWorkspaces } from '../../src/app/api/read-workspaces'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  readPublishedImport,
  readPublishedManifestPage,
  readPublishedPartRange,
} from './activation-data'
import { importFixture, type ImportFixture } from './service.test-support'

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

it('publishes one complete inactive workspace after durable byte verification and retains ordered private restoration data', async () => {
  await fixture.prepare('reservation', fixture.service)
  await expect(
    fixture.control({
      kind: 'snapshot',
      reservationId: 'reservation',
      snapshot: {
        ...SNAPSHOT,
        gitDisk: {
          ...SNAPSHOT.gitDisk,
          checkout: { ...SNAPSHOT.gitDisk.checkout, pathBytes: 74 },
        },
      },
    }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  expect(await fixture.missing()).toEqual(PARTS)
  await fixture.upload(
    'bundle',
    fixture.service,
    'reservation',
    new TextEncoder().encode('wrong!'),
  )
  expect(
    await fixture.control({
      kind: 'verify',
      reservationId: 'reservation',
      partId: 'bundle',
    }),
  ).toEqual({ kind: 'verified', verified: false, storedBytes: 0 })
  await expect(
    fixture.control({ kind: 'complete', reservationId: 'reservation' }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  expect(
    readWorkspaces(
      await (await fixture.request(workspacesPath(fixture.org.id))).json(),
    ),
  ).toEqual([])
  await fixture.verifyAll()
  const restored = fixture.make()
  expect(await fixture.missing(restored)).toEqual([])
  const completed = await Promise.all([
    restored.control(fixture.actor, {
      kind: 'complete',
      reservationId: 'reservation',
    }),
    restored.control(fixture.actor, {
      kind: 'complete',
      reservationId: 'reservation',
    }),
  ])
  expect(completed).toEqual([
    { kind: 'complete', workspaceId: 'reservation' },
    { kind: 'complete', workspaceId: 'reservation' },
  ])
  const listed = await fixture.request(workspacesPath(fixture.org.id))
  expect(readWorkspaces(await listed.json())).toMatchObject([
    {
      id: 'reservation',
      number: 1,
      state: 'inactive',
      name: 'Transferred work',
      conductorImport: {
        localWorkspaceId: 'local-source',
        importerUserId: fixture.user.id,
        activatedAt: null,
      },
    },
  ])
  expect(
    await fixture.db
      .prepare(
        'SELECT session_id,first_turn_id,first_message_id FROM workspace_runtime WHERE workspace_id = ?',
      )
      .bind('reservation')
      .first(),
  ).toEqual({ session_id: null, first_turn_id: null, first_message_id: null })
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM computer_ledger')
      .first('count'),
  ).toBe(0)
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM workspace_tokens')
      .first('count'),
  ).toBe(0)
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM image_leases')
      .first('count'),
  ).toBe(0)
  expect(
    await readPublishedImport(fixture.env, fixture.org.id, 'reservation'),
  ).toMatchObject({
    branch: 'owner/work',
    snapshot: { headOid: SOURCE_HEAD, sourceFingerprint: SOURCE_HASH },
  })
  expect(
    (await readPublishedImport(fixture.env, fixture.org.id, 'reservation'))
      .snapshot.gitDisk,
  ).toEqual({
    version: 1,
    treeOid: 'cccccccccccccccccccccccccccccccccccccccc',
    reconstruction: {
      objectCount: 4,
      inflatedBytes: 16384,
      maxObjectBytes: 8192,
    },
    checkout: {
      fileCount: 3,
      fileBytes: 4352,
      directoryCount: 2,
      symlinkCount: 1,
      symlinkBytes: 9,
      pathBytes: 73,
    },
    lfs: {
      cacheObjectCount: 1,
      cacheBytes: 8192,
      checkoutPathCount: 2,
      checkoutBytes: 16384,
    },
  })
  expect(
    (
      await readPublishedManifestPage(
        fixture.env,
        fixture.org.id,
        'reservation',
      )
    ).entries,
  ).toContainEqual({
    kind: 'symlink',
    path: 'link',
    target: '/outside/exact-target',
  })
  expect(
    new TextDecoder().decode(
      await readPublishedPartRange(
        fixture.env,
        fixture.org.id,
        'reservation',
        'code',
        { offset: 1, length: 2 },
      ),
    ),
  ).toBe('od')
  const documents = await fixture.request(
    conductorOldDocumentsPath(fixture.org.id, 'reservation'),
  )
  expect(await documents.json()).toEqual({
    documents: [
      {
        id: 'old-session',
        title: 'Old work',
        agent: 'codex',
        messageCount: 2,
        occurredAt: 1_799_999_999_999,
      },
    ],
    nextCursor: null,
  })
  const document = await fixture.request(
    conductorOldDocumentPath(fixture.org.id, 'reservation', 'old-session'),
  )
  expect(document.status).toBe(200)
  expect(await document.text()).toBe('first\nsecond\n')
})

it('replaces a changed source atomically and retries only missing parts without mixing reservations', async () => {
  await fixture.prepare('reservation', fixture.service)
  const oldTarget = await fixture.upload('bundle')
  await fixture.control({
    kind: 'target',
    reservationId: 'reservation',
    partId: 'bundle',
  })
  expect(await fixture.missing()).toEqual(PARTS.slice(1))
  const next = fixture.make('replacement')
  await expect(
    next.control(fixture.actor, {
      kind: 'reserve',
      row: fixture.source,
      replace: {
        reservationId: 'reservation',
        sourceFingerprint: 'c'.repeat(64),
      },
    }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  expect(
    await next.control(fixture.actor, {
      kind: 'reserve',
      row: fixture.source,
      replace: { reservationId: 'reservation', sourceFingerprint: SOURCE_HASH },
    }),
  ).toMatchObject({
    kind: 'reservation',
    reservation: { id: 'replacement', sourceFingerprint: null },
  })
  await expect(
    fixture.control({
      kind: 'verify',
      reservationId: 'reservation',
      partId: oldTarget.identity.part.id,
    }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  await expect(
    fixture.control({ kind: 'complete', reservationId: 'reservation' }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  expect(
    await fixture.db
      .prepare(
        'SELECT source_fingerprint AS fingerprint,manifest_count AS records,stored_bytes AS bytes FROM conductor_import_reservations WHERE id = ?',
      )
      .bind('replacement')
      .first(),
  ).toEqual({ fingerprint: null, records: 0, bytes: 0 })
  expect(
    await fixture.db
      .prepare(
        "SELECT group_name FROM conductor_import_cleanup WHERE reservation_id = 'reservation'",
      )
      .first('group_name'),
  ).toBe('all')
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM workspaces')
      .first('count'),
  ).toBe(0)
})
