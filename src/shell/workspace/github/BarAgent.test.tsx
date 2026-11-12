// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { loginGone, withSessions } from '../../../chat/state/linked-kit'
import type { FilesTab } from '../../../files/navigation'
import { sessionPaths } from '../../../shared/sessions'
import {
  byLabel,
  byRole,
  queryByLabel,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  asMessageField,
  messageText,
} from '../../../test-support/message-field'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { pressHintKey } from '../../shortcuts/shortcut-test-kit'
import { click, settle, typeText } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { bodiesOf, draftOf, messageField } from '../kept-test-kit'
import { openTab, socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, session } = FAKE_IDS
const fileTab: FilesTab = {
  kind: 'file',
  path: FAKE_FILE_PATH,
  mode: 'preview',
}
const fixChecks =
  'These checks failed on pull request #482: lint and e2e (chromium). Find out why with `gh pr checks 482`, and read the logs of failed GitHub Actions jobs with `gh run view --log-failed`. For a check from another service, read its details, or run it locally. Fix the cause, then commit and push. If `gh` is missing or fails, run the failed checks locally, and say that `gh` failed.'
const sends = (server: FakeApiServer) =>
  bodiesOf(server, 'POST', sessionPaths.messages(org, id, session), 0)
const sentTexts = async (server: FakeApiServer) =>
  (await sends(server)).map((body) => Object(body).text)

describe('the agent actions of the bar', () => {
  test('Fix checks sends its prompt to the session that the member saw last, also while a file shows, and the typed draft stays', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'checks-failed' })
    serveWork(server, 'none')
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
    )
    typeText(messageField(view), 'Half a thought')
    await settle()
    act(() => navigation.push(filesHref(org, id, fileTab)))
    await settle()

    click(byRole('button', 'Fix checks', byLabel('Files and tools', view)))
    await settle()
    const address = navigation.href()
    act(() => navigation.push(routes.workspace(org, id)))
    await settle()

    const choice = workspaceFixtures().sessions.sessions[0].choice
    expect({
      address,
      sends: (await sends(server)).map((body) => ({
        ...Object(body),
        id: null,
      })),
      draft: draftOf(view),
    }).toEqual({
      address: filesHref(org, id, fileTab),
      sends: [{ id: null, text: fixChecks, attachmentIds: [], choice }],
      draft: 'Half a thought',
    })
  })

  test('on a phone, an action that does not send shows the chat with the notice of its composer, and the draft stays', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'checks-failed' })
    serveWork(server, 'none')
    const refused = {
      code: 'unavailable',
      message: 'The Worker did not answer.',
    }
    server.json(
      'POST',
      sessionPaths.messages(org, id, session),
      { error: refused },
      503,
    )
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
      {
        viewport: 'phone',
      },
    )
    typeText(messageField(view), 'Half a thought')
    await settle()
    act(() =>
      navigation.push(filesHref(org, id, { kind: 'list', list: 'checks' })),
    )
    await settle()

    click(byRole('button', 'Fix checks', byLabel('Pull request actions', view)))
    await settle()

    const field = queryByLabel('Message', view)
    expect({
      address: navigation.href(),
      notice: (view.textContent ?? '').includes("Your message didn't send"),
      draft: field ? messageText(asMessageField(field)) : null,
    }).toEqual({
      address: routes.workspace(org, id),
      notice: true,
      draft: 'Half a thought',
    })
  })

  test('a blocked action sends nothing, and shows the chat of its session, whose composer names the login', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'checks-failed' })
    serveWork(server, 'none')
    withSessions(server, loginGone)
    const { view, navigation } = await openTab(
      server,
      filesHref(org, id, fileTab),
    )

    click(byRole('button', 'Fix checks', byLabel('Files and tools', view)))
    await settle()

    expect({
      sends: (await sends(server)).length,
      address: navigation.href(),
      notice: (view.textContent ?? '').includes('Connect Claude to use'),
    }).toEqual({ sends: 0, address: routes.workspace(org, id), notice: true })
  })

  test('the key of an agent action sends its prompt as a click does, only while the bar shows its button in the right column', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'checks-failed' })
    serveWork(server, 'none')
    const { app, view } = await openPaletteTab(routes.workspace(org, id), {
      server,
      events: socketsOf(server).events,
    })
    const press = async (command: 'create-pull-request' | 'fix-checks') => {
      const key = pressHintKey(app, command, document.body)
      await settle()
      return key.defaultPrevented
    }

    // The bar of failed checks shows Fix checks, and no Create PR.
    const create = await press('create-pull-request')
    const fix = await press('fix-checks')
    click(byRole('button', 'Hide the right column', view))
    const hidden = await press('fix-checks')

    expect({ create, fix, hidden, sends: await sentTexts(server) }).toEqual({
      create: false,
      fix: true,
      hidden: false,
      sends: [fixChecks],
    })
  })

  test('on a phone, the key of an agent action sends its prompt only while the Checks tab shows its button', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'checks-failed' })
    serveWork(server, 'none')
    const { app, navigation } = await openPaletteTab(
      routes.workspace(org, id),
      { server, viewport: 'phone', events: socketsOf(server).events },
    )

    const chat = pressHintKey(app, 'fix-checks', document.body)
    await settle()
    act(() =>
      navigation.push(filesHref(org, id, { kind: 'list', list: 'checks' })),
    )
    await settle()
    const checks = pressHintKey(app, 'fix-checks', document.body)
    await settle()

    expect({
      chat: chat.defaultPrevented,
      checks: checks.defaultPrevented,
      sends: await sentTexts(server),
    }).toEqual({ chat: false, checks: true, sends: [fixChecks] })
  })
})
