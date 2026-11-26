// @vitest-environment happy-dom

import { expect, test, vi } from 'vitest'
import { visiblePreviews } from '../../previews/previewsState'
import { previewsPath } from '../../shared/previews'
import { FakeApiServer } from '../../test-support/fake-api'
import { fakeUser } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { settle } from '../test-mount'
import { startedApp } from '../test-render'
import {
  away,
  emit,
  here,
  id,
  lastEvent,
  mountTab,
  org,
  recordingSocket,
} from './kept-test-kit'
import { shownWorkspaces } from './tab-memory'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

test('a kept workspace starts from its own cursor and keeps revokes over a later preview list', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer()
  const listed = toolFixtures().preview.preview
  const later = { ...listed, id: 'preview-later', port: 4000 }
  const path = previewsPath(org, id)
  server.json('GET', path, { previews: [listed, later] })
  const socket = recordingSocket(server)
  const app = await startedApp(server, { events: socket.source })
  const { go } = mountTab(app)
  await settle()
  const store = shownWorkspaces(app, fakeUser).previews(org, id)
  expect(visiblePreviews(store.getSnapshot())).toEqual([listed, later])
  expect(socket.opens[0]).toBe(lastEvent(server))

  emit(server, { type: 'preview.revoked', previewId: listed.id })
  const kept = lastEvent(server)
  go(away)
  await settle()
  const beforeReturn = socket.opens.length
  emit(server, { type: 'preview.revoked', previewId: later.id })

  go(here)
  await settle()
  expect(socket.opens.slice(beforeReturn)).toEqual([kept, kept, kept])
  expect(store.getSnapshot().load).toBeNull()
  expect(visiblePreviews(store.getSnapshot())).toEqual([])
  expect(store.getSnapshot().revoked).toEqual(new Set([listed.id, later.id]))
})
