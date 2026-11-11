import { PARTS } from './manifest.test-support'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  conductorOldDocumentPath,
  conductorOldDocumentsPath,
} from '../../src/shared/conductor-import.ts'
import { workspacePaths } from '../../src/shared/workspaces'
import { createHarness, type TestHarness } from '../test-support/harness'
import { importFixture, type ImportFixture } from './service.test-support'
import {
  held,
  immutableKey,
  keysForScope,
  observeGets,
} from './storage.test-support'
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

it('keeps old Markdown readable while inactive, stopped and archived with no native history in public metadata', async () => {
  await fixture.prepare('reservation', fixture.service)
  await fixture.verifyAll()
  await fixture.control({ kind: 'complete', reservationId: 'reservation' })
  const path = conductorOldDocumentPath(
    fixture.org.id,
    'reservation',
    'old-session',
  )
  expect(await (await fixture.request(path)).text()).toBe('first\nsecond\n')
  await fixture.db
    .prepare("UPDATE workspaces SET state = 'stopped' WHERE id = 'reservation'")
    .run()
  expect(await (await fixture.request(path)).text()).toBe('first\nsecond\n')
  await fixture.db
    .prepare(
      "UPDATE workspaces SET state = 'inactive' WHERE id = 'reservation'",
    )
    .run()
  const archived = await fixture.request(
    workspacePaths.archive(fixture.org.id, 'reservation'),
    'POST',
    {},
  )
  expect(archived.status).toBe(200)
  expect(await (await fixture.request(path)).text()).toBe('first\nsecond\n')
  const metadata = await (
    await fixture.request(
      conductorOldDocumentsPath(fixture.org.id, 'reservation'),
    )
  ).text()
  expect(metadata).not.toContain('native-test-id')
  expect(metadata).not.toContain('nativePath')
  expect(metadata).not.toContain('memoryObjectId')
  const bucket = fixture.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2.')
  expect((await keysForScope(bucket, fixture.service.scope)).length).toBe(10)
  expect(harness.boat.requests).toEqual([])
})

it('authorizes old documents against their workspace org and stops a stream when its member loses access', async () => {
  await fixture.prepare('reservation', fixture.service)
  await fixture.verifyAll()
  await fixture.control({ kind: 'complete', reservationId: 'reservation' })
  const other = conductorOldDocumentPath(
    'another-org',
    'reservation',
    'old-session',
  )
  expect((await fixture.request(other)).status).toBe(404)
  const absent = conductorOldDocumentPath(
    fixture.org.id,
    'reservation',
    'another-session',
  )
  expect((await fixture.request(absent)).status).toBe(404)
  const entered = held<void>()
  const session = await importReader(fixture)
  const release = held<void>()
  const bucket = fixture.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2.')
  const second = immutableKey({ scope: fixture.service.scope, part: PARTS[4] })
  fixture.env.CHAT_ATTACHMENTS = observeGets(bucket, async (key, read) => {
    if (key === second) {
      entered.resolve()
      await release.promise
    }
    return read()
  })
  const response = await fixture.request(
    conductorOldDocumentPath(fixture.org.id, 'reservation', 'old-session'),
    'GET',
    undefined,
    session,
  )
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing document body.')
  expect(new TextDecoder().decode((await reader.read()).value)).toBe('first\n')
  await entered.promise
  await fixture.db
    .prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(fixture.org.id, 'document-reader')
    .run()
  release.resolve()
  await expect(reader.read()).rejects.toThrow(
    'The old document could not be read.',
  )
  expect(
    (
      await fixture.request(
        conductorOldDocumentsPath(fixture.org.id, 'reservation'),
        'GET',
        undefined,
        session,
      )
    ).status,
  ).toBe(404)
})
