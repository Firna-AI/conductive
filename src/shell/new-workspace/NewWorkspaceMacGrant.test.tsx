// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { secretsPath } from '../../shared/secrets'
import { workspacesPath } from '../../shared/workspaces'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import {
  FAKE_PAIRING,
  fakeMacSettings,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import { textOf } from '../test-render'
import { bodiesOf, org } from '../workspace/kept-test-kit'
import { mainOf, messageIn, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { secrets } = secretFixtures()
const { created } = workspaceFixtures()
const newId = created.workspace.id
const noticeTitle = 'Could not allow all commands on this Mac'
const barLabel = 'Commands that run without asking'
const cause = 'The Mac could not change this permission. Try again.'
const startOfNew = { action: 'start-workspace-until-stop', workspaceId: newId }

/** The settings of the fake Mac with the grant until Stop of the new workspace. */
const untilStopOfNew = {
  ...fakeMacSettings(),
  workspaceWindows: [
    { workspaceId: newId, workspaceName: null, expiresAt: null },
  ],
}

/** The New workspace page in the Mac app, with its Capabilities open. */
async function openNewWorkspace() {
  const server = serverWith('page', { onMac: true })
  server.json('GET', secretsPath(org), { secrets })
  const tab = await openTab(server, {
    at: routes.newWorkspace(org),
    macApp: true,
  })
  const main = mainOf(tab.view)
  click(byRole('button', 'Capabilities', main))
  await settle()
  return { server, tab, main, control: byRole('dialog', 'Capabilities', main) }
}

/** Whether the switch of Mac access in `root` shows on. */
const switchOn = (root: HTMLElement) =>
  byRole('switch', 'Mac access', root).getAttribute('aria-checked') === 'true'

/** The notice of a start that failed after the create, or null. */
const noticeIn = (view: HTMLElement) =>
  queryByText(noticeTitle, view)?.closest<HTMLElement>('[role="alert"]') ?? null

/** Sends the first message of the draft, which creates the workspace. */
function send(main: HTMLElement): void {
  typeText(messageIn(main), 'Let shoppers save their cart.')
  click(byRole('button', 'Send', main))
}

/**
 * Turns the switch of Mac access on in New workspace, and creates the
 * workspace while the Mac does not make the start of its grant. It waits
 * for the notice in the new workspace.
 */
async function createWithFailedStart() {
  const opened = await openNewWorkspace()
  const { server, tab, main, control } = opened
  click(byRole('switch', 'Mac access', control))
  const chosen = switchOn(control)
  server.json(
    'POST',
    DEVICE_SETTINGS_PATH,
    fakeSettingsReply(fakeMacSettings(), { status: 'failed', message: cause }),
  )
  send(main)
  const notice = await waitFor(() => noticeIn(tab.view), 'the notice')
  return { ...opened, chosen, notice }
}

/** The posts of the page, each as its method and path, in their order. */
const postsOf = (server: FakeApiServer) =>
  server.requests
    .filter((request) => request.method === 'POST')
    .map((request) => `${request.method} ${new URL(request.url).pathname}`)

describe('the grant of this Mac after a create from New workspace', () => {
  test('a create with the switch on sends no Mac access, then starts the grant until Stop of the new workspace on this Mac, and a start that fails shows a notice in the new workspace, whose Try again starts it', async () => {
    const { server, tab, chosen, notice } = await createWithFailedStart()
    const [sent] = await bodiesOf(server, 'POST', workspacesPath(org), 0)
    const failed = {
      address: tab.address(),
      notice: textOf(notice.innerHTML),
      bar: queryByRole('region', barLabel, tab.view),
      posts: postsOf(server),
    }
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(untilStopOfNew))
    click(
      byRole('button', 'Try again to allow all commands on this Mac', tab.view),
    )
    const bar = await waitFor(
      () => queryByRole('region', barLabel, tab.view),
      'the bar of the grant',
    )
    await settle()
    expect({
      chosen,
      sent,
      failed,
      notice: noticeIn(tab.view),
      bar: textOf(bar.innerHTML),
      starts: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, 0),
    }).toEqual({
      chosen: true,
      sent: expect.objectContaining({
        capabilities: { preapprovedSecretIds: [] },
      }),
      failed: {
        address: routes.workspace(org, newId),
        notice: `${noticeTitle} ${cause} Try again`,
        bar: null,
        posts: [`POST ${workspacesPath(org)}`, `POST ${DEVICE_SETTINGS_PATH}`],
      },
      notice: null,
      bar: 'Every command from this workspace runs on this Mac without asking. Until you stop Stop',
      starts: [1, 2].map(() => ({ ...FAKE_PAIRING, operation: startOfNew })),
    })
  })

  test('the switch in the Capabilities of the new workspace shows the same failed start, and a start from that switch ends the notice, also when it fails too', async () => {
    const { server, tab } = await createWithFailedStart()
    click(byRole('button', 'Capabilities', tab.view))
    await settle()
    const control = byRole('dialog', 'Capabilities', tab.view)
    const part = () => textOf(byRole('region', 'Mac access', control).innerHTML)
    const failed = { on: switchOn(control), text: part() }
    const starts = () =>
      server.requests.filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname === DEVICE_SETTINGS_PATH,
      ).length
    const before = starts()
    // The Mac does not make this start either.
    click(byRole('switch', 'Mac access', control))
    await waitFor(
      () => starts() > before && part().includes('Not started'),
      'the result of the start from the switch',
    )
    expect({
      failed,
      again: { on: switchOn(control), text: part() },
      notice: noticeIn(tab.view),
    }).toEqual({
      failed: { on: false, text: `Mac access Not started ${cause}` },
      again: { on: false, text: `Mac access Not started ${cause}` },
      notice: null,
    })
  })

  test('the switch starts off, and a create with it off starts no grant', async () => {
    const { server, tab, main, control } = await openNewWorkspace()
    const shown = switchOn(control)
    send(main)
    await waitFor(
      () => tab.address() === routes.workspace(org, newId),
      'the new workspace',
    )
    await settle()
    expect({ shown, posts: postsOf(server) }).toEqual({
      shown: false,
      posts: [`POST ${workspacesPath(org)}`],
    })
  })
})
