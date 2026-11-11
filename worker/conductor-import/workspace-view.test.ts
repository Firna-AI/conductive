import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { readView } from '../../src/chat/api/read-responses'
import { tabKey } from '../../src/chat/state/tab-order'
import { conductorOldDocumentsPath } from '../../src/shared/conductor-import'
import { readConductorOldDocuments } from '../../src/shared/conductor-import-documents-read'
import type { WorkspaceView } from '../../src/shared/workspace-view'
import { workspaceViewPath } from '../../src/shared/workspace-view'
import { workspacePaths } from '../../src/shared/workspaces'
import { createHarness, type TestHarness } from '../test-support/harness'
import { importReader } from './member.test-support'
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

it('keeps a published old document active beside native tabs in its member view and preserves archived reads', async () => {
  await fixture.prepare('reservation', fixture.service)
  await fixture.verifyAll()
  await fixture.control({ kind: 'complete', reservationId: 'reservation' })
  const metadata = await fixture.request(
    conductorOldDocumentsPath(fixture.org.id, 'reservation'),
  )
  expect(metadata.status).toBe(200)
  const { documents } = readConductorOldDocuments(await metadata.json())
  expect(documents.map(({ id }) => id)).toEqual(['old-session'])
  const documentId = documents[0].id
  const document = { kind: 'conductor-document' as const, documentId }
  const view: WorkspaceView = {
    tabs: [
      { kind: 'session', sessionId: 'native-session' },
      { kind: 'file', path: 'src/source.ts', mode: 'source' },
      document,
      { kind: 'file', path: 'notes/preview.md', mode: 'preview' },
      { kind: 'diff', path: 'src/source.ts' },
    ],
    activeTab: document,
    fileList: 'changes',
    tool: 'preview',
  }
  const privateFields = {
    sourcePath: '/private/synthetic-source',
    nativeId: 'private-synthetic-native',
    objectId: 'private-synthetic-object',
    uploadTarget: 'https://private-synthetic-upload.test',
  }
  const submitted = {
    ...view,
    tabs: view.tabs.map((tab) =>
      tab.kind === 'conductor-document' ? { ...tab, ...privateFields } : tab,
    ),
    activeTab: { ...document, ...privateFields },
  }
  const path = workspaceViewPath(fixture.org.id, 'reservation')
  const saved = await fixture.request(path, 'PUT', submitted)
  expect(saved.status).toBe(200)
  const savedBody: unknown = await saved.json()
  expect(savedBody).toEqual({ view, routine: null, baseBranch: 'main' })
  expect(readView(savedBody)).toEqual(view)
  const reopened = await fixture.request(path)
  expect(reopened.status).toBe(200)
  const reopenedBody: unknown = await reopened.json()
  expect(reopenedBody).toEqual({ view, routine: null, baseBranch: 'main' })
  expect(readView(reopenedBody)).toEqual(view)
  expect(readView(reopenedBody).tabs.map(tabKey)).toEqual([
    'session:native-session',
    'file:src/source.ts',
    'conductor-document:old-session',
    'file:notes/preview.md',
    'diff:src/source.ts',
  ])
  const memberSession = await importReader(fixture)
  const memberView = await fixture.request(
    path,
    'GET',
    undefined,
    memberSession,
  )
  expect(memberView.status).toBe(200)
  expect(readView(await memberView.json())).toEqual({
    tabs: [],
    activeTab: null,
    fileList: 'all',
    tool: 'terminal',
  })
  const malformed = await fixture.request(path, 'PUT', {
    ...view,
    activeTab: { kind: 'conductor-document', documentId: '' },
  })
  expect(malformed.status).toBe(400)
  expect(await malformed.json()).toEqual({
    error: {
      code: 'invalid_input',
      message: 'Check the message and try again.',
    },
  })
  expect(readView(await (await fixture.request(path)).json())).toEqual(view)
  const archived = await fixture.request(
    workspacePaths.archive(fixture.org.id, 'reservation'),
    'POST',
    {},
  )
  expect(archived.status).toBe(200)
  const archivedView = await fixture.request(path)
  expect(archivedView.status).toBe(200)
  expect(readView(await archivedView.json())).toEqual(view)
  const refused = await fixture.request(path, 'PUT', view)
  expect(refused.status).toBe(409)
  expect(await refused.json()).toEqual({
    error: {
      code: 'workspace_archived',
      message: 'The archived chat is read-only.',
    },
  })
  expect(readView(await (await fixture.request(path)).json())).toEqual(view)
  expect(harness.boat.requests).toEqual([])
})
