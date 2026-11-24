// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { requestLines } from '../../../app/test-kit'
import { filePaths } from '../../../shared/files'
import { sessionPaths } from '../../../shared/sessions'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveWork, workReport } from '../../../test-support/fake-bar'
import { FAKE_IDS, fakeUsers } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle, typeText } from '../../test-mount'
import { startedApp } from '../../test-render'
import {
  bodiesOf,
  draftOf,
  emit,
  lastEvent,
  messageField,
  mountTab,
  recordingSocket,
} from '../kept-test-kit'
import { linksTo, openTab } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, session } = FAKE_IDS
const checksHref = filesHref(org, id, { kind: 'list', list: 'checks' })
const createPrompt =
  'Commit the changes that are not committed, push this branch, and open a pull request into `main` with `gh pr create`. Write a short title, and describe what changed and why. If `gh` is missing or fails, push the branch and say that `gh` failed.'

describe('the kept files of the workspace screen', () => {
  test('a phone on the chat tab follows the local work, so a branch with no commits and a changed file opens Checks, and Files opens no second connection', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'no-commits' })
    serveWork(server, 'files')
    const socket = recordingSocket(server)
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
      {
        viewport: 'phone',
        events: socket.source,
      },
    )
    const rows = () =>
      linksTo(view, checksHref).filter(
        (link) => link.textContent === 'Create PR',
      )
    // The files connect on the chat tab, so the row knows the local work.
    expect({ rows: rows().length, sockets: socket.connected() }).toEqual({
      rows: 1,
      sockets: 3,
    })
    emit(server, { type: 'changes.updated', changes: workReport('none') })
    await settle()
    const clean = {
      rows: rows().length,
      plain: (view.textContent ?? '').includes('No commits yet'),
    }
    emit(server, { type: 'changes.updated', changes: workReport('files') })
    await settle()

    click(rows()[0])
    await settle()
    click(byRole('button', 'Create PR', byLabel('Pull request actions', view)))
    await settle()

    const sent = await bodiesOf(
      server,
      'POST',
      sessionPaths.messages(org, id, session),
      0,
    )
    expect({
      clean,
      address: navigation.href(),
      sockets: socket.connected(),
      prompts: sent.map((body) => Object(body).text),
    }).toEqual({
      clean: { rows: 0, plain: true },
      address: checksHref,
      sockets: 3,
      prompts: [createPrompt],
    })
  })
})

test('reads the Files lists again after sign-out and clears the draft when the member changes', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer()
  const socket = recordingSocket(server)
  const app = await startedApp(server, { events: socket.source })
  const { view } = mountTab(app)
  await settle()
  typeText(messageField(view), 'A draft of the first person')
  await act(() => app.account.signOut())
  expect(app.boot.get().state).toBe('signed-out')
  const signedOut = socket.opens.length
  const before = server.requests.length
  emit(server, { type: 'workspace.title', name: 'Saved addresses' })
  const cutoff = lastEvent(server)
  await act(() => app.start())
  await settle()
  expect(draftOf(view)).toBe('')
  expect(
    socket.opens.slice(signedOut).filter((after) => after === cutoff),
  ).toHaveLength(2)
  const lists = [filePaths.tree(org, id), filePaths.changes(org, id)].map(
    (path) => `GET ${path}`,
  )
  expect(
    requestLines(server)
      .slice(before)
      .filter((line) => lists.includes(line))
      .sort(),
  ).toEqual(lists.sort())
  typeText(messageField(view), 'A draft before another person')
  server.signIn(fakeUsers[1])
  await act(() => app.start())
  await settle()
  expect(draftOf(view)).toBe('')
})
