// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { secretsPath, workspaceCapabilitiesPath } from '../../shared/secrets'
import { workspacesPath } from '../../shared/workspaces'
import {
  byRole,
  queryByLabel,
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
import { org } from '../workspace/kept-test-kit'
import { mainOf, messageIn, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { secrets } = secretFixtures()
const { created } = workspaceFixtures()
const newId = created.workspace.id
const noticeTitle = 'Could not allow all commands on this Mac'
const barLabel = 'Commands that run without asking'
const cause = 'The Mac could not change this permission. Try again.'
const hint =
  'Mac access Lets agents ask to run commands on the Mac of the member who sent the message.'
const line =
  'Allow all commands on this Mac Commands from this workspace run without asking, until you stop.'

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

/** The box of the line of this Mac in the control. */
function lineBox(control: HTMLElement): HTMLInputElement {
  const box = queryByLabel('Allow all commands on this Mac', control)
  if (!(box instanceof HTMLInputElement)) throw new Error('No line shows.')
  return box
}

/** The notice of a start that failed after the create, or null. */
const noticeIn = (view: HTMLElement) =>
  queryByText(noticeTitle, view)?.closest<HTMLElement>('[role="alert"]') ?? null

/** Sends the first message of the draft, which creates the workspace. */
function send(main: HTMLElement): void {
  typeText(messageIn(main), 'Let shoppers save their cart.')
  click(byRole('button', 'Send', main))
}

/**
 * Turns Mac access on in New workspace, which checks the line, and creates
 * the workspace while the Mac does not make the start of its grant. It
 * waits for the notice in the new workspace.
 */
async function createWithFailedStart() {
  const opened = await openNewWorkspace()
  const { server, tab, main, control } = opened
  click(byRole('switch', 'Mac access', control))
  const line = {
    checked: lineBox(control).checked,
    text: textOf(lineBox(control).closest('label')?.innerHTML ?? ''),
  }
  server.json(
    'POST',
    DEVICE_SETTINGS_PATH,
    fakeSettingsReply(fakeMacSettings(), { status: 'failed', message: cause }),
  )
  send(main)
  const notice = await waitFor(() => noticeIn(tab.view), 'the notice')
  return { ...opened, line, notice }
}

/** The posts of the page, each as its method and path, in their order. */
const postsOf = (server: FakeApiServer) =>
  server.requests
    .filter((request) => request.method === 'POST')
    .map((request) => `${request.method} ${new URL(request.url).pathname}`)

describe('the grant of this Mac after a create from New workspace', () => {
  test('a create with Mac access on starts the grant until Stop of the new workspace on this Mac, and a start that fails shows a notice in the new workspace, whose Try again starts it', async () => {
    const { server, tab, line, notice } = await createWithFailedStart()
    const failed = {
      address: tab.address(),
      notice: textOf(notice.innerHTML),
      bar: queryByRole('region', barLabel, tab.view),
      posts: postsOf(server),
    }
    const untilStop = {
      workspaceId: newId,
      workspaceName: null,
      expiresAt: null,
    }
    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({
        ...fakeMacSettings(),
        workspaceWindows: [untilStop],
      }),
    )
    click(
      byRole('button', 'Try again to allow all commands on this Mac', tab.view),
    )
    const bar = await waitFor(
      () => queryByRole('region', barLabel, tab.view),
      'the bar of the grant',
    )
    await settle()
    const starts = server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === DEVICE_SETTINGS_PATH,
    )
    expect({
      line,
      failed,
      notice: noticeIn(tab.view),
      bar: textOf(bar.innerHTML),
      starts: await Promise.all(starts.map((item) => item.clone().json())),
    }).toEqual({
      line: {
        checked: true,
        text: 'Allow all commands on this Mac Commands from the new workspace run without asking, until you stop.',
      },
      failed: {
        address: routes.workspace(org, newId),
        notice: `${noticeTitle} ${cause} Try again`,
        bar: null,
        posts: [`POST ${workspacesPath(org)}`, `POST ${DEVICE_SETTINGS_PATH}`],
      },
      notice: null,
      bar: 'Every command from this workspace runs on this Mac without asking. Until you stop Stop',
      starts: [1, 2].map(() => ({
        ...FAKE_PAIRING,
        operation: { action: 'start-workspace-until-stop', workspaceId: newId },
      })),
    })
  })

  test('the line in the Capabilities of the new workspace shows the same failed start, which ends once a read shows Mac access off', async () => {
    const { server, tab } = await createWithFailedStart()
    const capabilities = () => byRole('button', 'Capabilities', tab.view)
    const macAccessText = () =>
      textOf(
        byRole(
          'region',
          'Mac access',
          byRole('dialog', 'Capabilities', tab.view),
        ).innerHTML,
      )
    /** The next open of the control reads Mac access `on`. */
    const readsMacAccess = (on: boolean) =>
      server.json('GET', workspaceCapabilitiesPath(org, newId), {
        capabilities: {
          preapprovedSecretIds: [],
          macAccess: on,
          sessionApprovals: [],
        },
      })
    click(capabilities())
    await settle()
    const failed = macAccessText()
    click(capabilities())
    // Another member turns Mac access off, then on again. Each open reads it.
    readsMacAccess(false)
    click(capabilities())
    await waitFor(() => noticeIn(tab.view) === null, 'the end of the notice')
    click(capabilities())
    readsMacAccess(true)
    click(capabilities())
    await settle()
    expect({
      failed,
      after: macAccessText(),
      notice: noticeIn(tab.view),
    }).toEqual({
      failed: `${hint} ${line} Not started ${cause}`,
      after: `${hint} ${line}`,
      notice: null,
    })
  })

  test('a create with the line unchecked starts no grant', async () => {
    const { server, tab, main, control } = await openNewWorkspace()
    click(byRole('switch', 'Mac access', control))
    click(lineBox(control))
    send(main)
    await waitFor(
      () => tab.address() === routes.workspace(org, newId),
      'the new workspace',
    )
    await settle()
    expect(postsOf(server)).toEqual([`POST ${workspacesPath(org)}`])
  })
})
