// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test } from 'vitest'
import { withPickedFiles } from '../../../app/draft-files.test-support'
import { routes } from '../../../app/router'
import { HeldRequests } from '../../../app/test-kit'
import { record, text } from '../../../chat/api/json'
import { attachmentUploadStartPath } from '../../../shared/messages'
import { sessionPaths } from '../../../shared/sessions'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS, fakeUser } from '../../../test-support/fixtures/core'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import { holdAnimationFrames } from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { click, settle, typeText } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { bodiesOf, messageField } from '../kept-test-kit'
import { shownWorkspaces } from '../tab-memory'

const { org, workspace: id, session } = FAKE_IDS

test('a fixed prompt stays one accepted message after leaving and returning before its reply, and keeps the draft and upload', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer({ banner: 'checks-failed' })
  serveWork(server, 'none')
  const path = sessionPaths.messages(org, id, session)
  const upload = attachmentUploadStartPath(org, {
    type: 'workspace',
    workspaceId: id,
  })
  const accepted: string[] = []
  server.handle('POST', path, async (request) => {
    const body = record(await request.json())
    const clientId = text(body.id)
    accepted.push(clientId)
    const data = workspaceFixtures()
    return Response.json(
      {
        message: { ...data.message, id: clientId, text: text(body.text) },
        session: data.sessions.sessions[0],
        turnId: 'turn-1',
        eventNumber: server.events.history().throughEventNumber,
      },
      { status: 202 },
    )
  })
  const held = new HeldRequests(server)
  held.holdAnswer('POST', path)
  held.holdAnswer('POST', upload)
  const here = routes.workspace(org, id)
  const checks = filesHref(org, id, { kind: 'list', list: 'checks' })
  const { app, view, navigation } = await openPaletteTab(here, {
    server,
    viewport: 'phone',
    fetch: held.fetch,
  })
  const chat = shownWorkspaces(app, fakeUser).view({
    orgId: org,
    workspaceId: id,
  }).chat
  const draft = () => chat.getSnapshot().sessionStates[session].draft
  const go = async (address: string) => {
    act(() => navigation.push(address))
    await settle()
  }
  const press = async () => {
    click(byRole('button', 'Fix checks', byLabel('Pull request actions', view)))
    await settle()
  }
  typeText(messageField(view), 'Half a thought')
  act(() => {
    const picked = chat.attachFiles(session, [new File(['x'], 'note.txt')])
    chat.setDraft(session, withPickedFiles(draft().text, picked))
  })
  await settle()
  const before = draft()
  expect(before).toMatchObject({
    files: [{ id: 'file-1', state: 'uploading' }],
    sendId: null,
  })
  await go(checks)
  await press()
  expect(accepted).toEqual(['client-1'])
  await go(routes.automations(org))
  await go(checks)
  const history = [...navigation.history]

  await press()

  const requests = await bodiesOf(server, 'POST', path, 0)
  expect({
    accepted,
    ids: requests.map((body) => record(body).id),
    history: navigation.history,
    address: navigation.href(),
    draft: draft(),
    uploads: (await bodiesOf(server, 'POST', upload, 0)).length,
  }).toEqual({
    accepted: ['client-1'],
    ids: ['client-1'],
    history,
    address: checks,
    draft: before,
    uploads: 1,
  })
  held.release('POST', path)
  await settle()
  expect(
    chat.getSnapshot().sessionStates[session].pending.map(({ id }) => id),
  ).toEqual(['client-1'])
  expect(draft()).toEqual(before)
  held.release('POST', upload)
  await settle()
  expect(draft()).toMatchObject({
    id: before.id,
    text: before.text,
    files: [{ id: 'file-1', state: 'ready' }],
  })
  expect((await bodiesOf(server, 'POST', upload, 0)).length).toBe(1)
})
