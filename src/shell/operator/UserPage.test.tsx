// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { signInCopy } from '../../../docs/mockups/src/screens/signInCopy'
import { routes } from '../../app/router'
import {
  operatorUserPath,
  userSuspensionPath,
  type UserSuspensionLiftResponse,
  type UserSuspensionResponse,
} from '../../shared/operator'
import { byRole, byText, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import type { Viewport } from '../ui/viewport'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The page of a user whose detail the API gives, with its first read. */
async function openUser(githubId: number, viewport: Viewport = 'desktop') {
  const server = new FakeApiServer()
  const fixtures = serveOperator(server)
  const user = fixtures.users.find((item) => item.githubId === githubId)
  if (!user) throw new Error(`The samples have no user ${githubId}.`)
  const href = routes.operatorUser(githubId)
  const shell = await mountShell(server, href, { viewport })
  const header = () =>
    textOf(shell.view.querySelector('main header')?.innerHTML ?? '')
  return { server, user, header, ...shell }
}

/** The sections of the body of a page, as text. */
function sections(view: HTMLElement): string[] {
  return Array.from(view.querySelectorAll('main section'), (section) =>
    textOf(section.innerHTML),
  )
}

describe('the page of a user for the operator', () => {
  test('shows the name, the GitHub ID, the join day, and the workspaces, and lists the orgs with roles, which open their pages', async () => {
    const page = await openUser(SAMPLE_IDS.activeUser)
    const shown = { header: page.header(), body: sections(page.view) }
    const nameless = await openUser(77120345)
    const details = sections(nameless.view)[0]
    click(byText('Blue Harbor', page.view))
    await settle()
    expect({
      ...shown,
      nameless: details,
      opened: page.view.querySelector('main h1')?.textContent,
    }).toEqual({
      header: 'Users @mira-s Mira Santos Suspend user',
      body: [
        'Details Name Mira Santos GitHub ID 52230011 Joined 10 Dec 2026 Workspaces 23 owned, 1 running',
        'Orgs TP Tidepool Member LW Lumen Works Member BH Blue Harbor Admin',
      ],
      nameless:
        'Details GitHub ID 77120345 Joined 4 Jan 2027 Workspaces 6 owned, 2 running',
      opened: 'Blue Harbor',
    })
  })

  test('a suspension shows its time and operator, and Lift sends {} with DELETE and reads the user again', async () => {
    const page = await openUser(SAMPLE_IDS.suspendedUser)
    const notice = [
      'Suspended on 13 Jan at 09:12 by @calummoore',
      '@dana-k cannot sign in, and no member can start the workspaces that @dana-k owns. An admin can move them to another member.',
    ]
    const shown = notice.filter((line) => queryByText(line) !== null)
    const path = userSuspensionPath(page.user.githubId)
    page.server.json('DELETE', path, {
      userId: 'dana',
      liftedAt: FAKE_TIME,
      pendingWorkspaceIds: [],
    } satisfies UserSuspensionLiftResponse)
    page.server.json('GET', operatorUserPath(page.user.githubId), {
      ...page.user,
      suspension: null,
    })
    click(byRole('button', 'Lift suspension'))
    const dialog = byRole('dialog', 'Lift the suspension of @dana-k?')
    click(byRole('button', 'Lift suspension', dialog))
    await settle()
    expect({
      shown,
      header: page.header(),
      requests: await operatorRequests(page.server),
    }).toEqual({
      shown: notice,
      header: 'Users @dana-k Dana Kim Suspend user',
      requests: [
        `GET ${operatorUserPath(page.user.githubId)}`,
        `DELETE ${path} {}`,
        `GET ${operatorUserPath(page.user.githubId)}`,
      ],
    })
  })

  test('on a phone, Suspend sits after the page, and a suspension shows the cloud computer that is still stopping', async () => {
    const page = await openUser(SAMPLE_IDS.activeUser, 'phone')
    const path = userSuspensionPath(page.user.githubId)
    const before = { header: page.header(), end: page.text().slice(-12) }
    page.server.json(
      'POST',
      path,
      {
        userId: 'mira',
        suspendedAt: FAKE_TIME,
        pendingWorkspaceIds: ['w-1'],
        pendingBuildIds: [],
      } satisfies UserSuspensionResponse,
      202,
    )
    page.server.json('GET', operatorUserPath(page.user.githubId), {
      ...page.user,
      suspension: { suspendedAt: FAKE_TIME, operator: sampleOperator },
    })
    click(byRole('button', 'Suspend user'))
    const sheet = byRole('dialog', 'Suspend @mira-s?')
    click(byRole('button', 'Suspend user', sheet))
    await settle()
    expect({
      before,
      stopping:
        queryByText(
          '@mira-s cannot sign in, and no member can start the workspaces that @mira-s owns. An admin can move them to another member. 1 cloud computer is still stopping, and it keeps trying on its own.',
        ) !== null,
      requests: await operatorRequests(page.server),
    }).toEqual({
      before: { header: '@mira-s Mira Santos', end: 'Suspend user' },
      stopping: true,
      requests: [
        `GET ${operatorUserPath(page.user.githubId)}`,
        `POST ${path} {}`,
        `GET ${operatorUserPath(page.user.githubId)}`,
      ],
    })
  })

  test('on the operator’s own page, Suspend warns first, sends {}, and then shows the sign-in', async () => {
    const page = await openUser(SAMPLE_IDS.self)
    const path = userSuspensionPath(page.user.githubId)
    page.server.json('POST', path, {
      userId: 'cal',
      suspendedAt: FAKE_TIME,
      pendingWorkspaceIds: [],
      pendingBuildIds: [],
    } satisfies UserSuspensionResponse)
    click(byRole('button', 'Suspend user'))
    const dialog = byRole('dialog', 'Suspend @calummoore?')
    const question = textOf(dialog.innerHTML)
    click(byRole('button', 'Suspend user', dialog))
    await settle()
    expect({
      question,
      signIn: page.view.querySelector('h1')?.textContent,
      requests: await operatorRequests(page.server),
    }).toEqual({
      question:
        'Suspend @calummoore? This is your own account. You will be signed out, and another operator must lift the suspension. @calummoore is signed out everywhere and cannot sign in. Their workspaces stop, and no member can start them until an admin moves them to another member. Each unfinished build that runs for @calummoore stops and fails, and a lift does not bring it back. A stopped workspace gets no restart near day 14, so its files can be deleted. Lift gives the access back. Cancel Suspend user',
      signIn: signInCopy.title,
      requests: [
        `GET ${operatorUserPath(page.user.githubId)}`,
        `POST ${path} {}`,
      ],
    })
  })
})
