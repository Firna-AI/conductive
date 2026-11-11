// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { sessionPaths } from '../../../shared/sessions'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveWork, workReport } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { bodiesOf, emit, recordingSocket } from '../kept-test-kit'
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
