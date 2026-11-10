// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { signInCopy } from '../../../docs/mockups/src/screens/signInCopy'
import {
  operatorUserPath,
  userSuspensionPath,
  type OperatorUserDetail,
  type UserSuspensionLiftResponse,
  type UserSuspensionResponse,
} from '../../shared/operator'
import { operatorCodeDisablePath } from '../../shared/operator-waitlist'
import { byRole, byText, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { disabledCode } from '../../test-support/fixtures/operator-access'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { openUser, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/**
 * Serves the disable of the referral code of a user, as the reply of the
 * Worker gives it, and returns its path.
 */
function serveDisable(server: FakeApiServer, user: OperatorUserDetail) {
  const code = user.referralCode
  if (!code) throw new Error(`@${user.login} has no referral code.`)
  const path = operatorCodeDisablePath(code.code)
  server.json('POST', path, disabledCode(code, FAKE_TIME, sampleOperator))
  return path
}

/** The sections of the body of a page, as text. */
function sections(view: HTMLElement): string[] {
  return Array.from(view.querySelectorAll('main section'), (section) =>
    textOf(section.innerHTML),
  )
}

describe('the page of a user for the operator', () => {
  test('shows the name, the GitHub ID, the age on GitHub, the join day, the workspaces, the app access, and the referral code, and lists the orgs with roles, which open their pages', async () => {
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
        'Details Name Mira Santos GitHub ID 52230011 On GitHub 6 years Joined 10 Dec 2026 Workspaces 23 owned, 1 running',
        'App access How Joined before the waitlist Since 10 Dec 2026',
        'Referral code Active Code M4QTX-7HKWD Uses 1 of 5 used Used by SO @tide-sam Sam Ortiz 14 Jan Disable code',
        'Orgs TP Tidepool Member LW Lumen Works Member BH Blue Harbor Admin',
      ],
      nameless:
        'Details GitHub ID 77120345 On GitHub 2 months Joined 4 Jan 2027 Workspaces 6 owned, 2 running',
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
    const page = await openUser(SAMPLE_IDS.activeUser, { viewport: 'phone' })
    const path = userSuspensionPath(page.user.githubId)
    const disable = serveDisable(page.server, page.user)
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
        `POST ${disable} {}`,
        `GET ${operatorUserPath(page.user.githubId)}`,
      ],
    })
  })

  test('on the operator’s own page, Suspend warns first, disables the referral code before the suspension ends the session, and then shows the sign-in', async () => {
    const page = await openUser(SAMPLE_IDS.self)
    const path = userSuspensionPath(page.user.githubId)
    const disable = serveDisable(page.server, page.user)
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
        'Suspend @calummoore? This is your own account. You will be signed out, and another operator must lift the suspension. @calummoore is signed out everywhere and cannot sign in. Their workspaces stop, and no member can start them until an admin moves them to another member. Each unfinished build that runs for @calummoore stops and fails, and a lift does not bring it back. A stopped workspace gets no restart near day 14, so its files can be deleted. Lift gives the access back. Also disable their referral code K7QHM-3XP2R then lets nobody in, also after a lift. Disable is final. Cancel Suspend user',
      signIn: signInCopy.title,
      requests: [
        `GET ${operatorUserPath(page.user.githubId)}`,
        `POST ${disable} {}`,
        `POST ${path} {}`,
      ],
    })
  })
})
