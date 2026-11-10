// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  operatorOrgPath,
  orgSuspensionPath,
  type OrgSuspensionLiftResponse,
  type OrgSuspensionResponse,
} from '../../shared/operator'
import {
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The text of the header of the page, and of its body. */
function pageText(view: HTMLElement) {
  return {
    header: textOf(view.querySelector('main header')?.innerHTML ?? ''),
    body: Array.from(view.querySelectorAll('main section'), (section) =>
      textOf(section.innerHTML),
    ),
  }
}

/** The page of an org whose detail the API gives, with its first read. */
async function openOrg(orgId: string) {
  const server = new FakeApiServer()
  const fixtures = serveOperator(server)
  const org = fixtures.orgs.find((item) => item.id === orgId)
  if (!org) throw new Error(`The samples have no org ${orgId}.`)
  const shell = await mountShell(server, routes.operatorOrg(orgId))
  return { server, org, ...shell }
}

describe('the page of an org for the operator', () => {
  test('shows its details, its workspaces by state with its running builds, and its members with names and roles, which open their pages', async () => {
    const { view } = await openOrg(SAMPLE_IDS.activeOrg)
    const shown = pageText(view)
    click(byText('@li-wei'))
    await settle()
    expect({
      ...shown,
      opened: view.querySelector('main h1')?.textContent,
    }).toEqual({
      header: 'Orgs Northwind Org Suspend org',
      body: [
        'Details Org ID org_n0rthw1nd Created 30 Sept 2026 Repositories 5',
        'Workspaces Running 4 2% Stopped 130 79% Failed 2 1% Archived 28 17% 2 cloud computer builds also run now.',
        'Members 2 members LW @li-wei Li Wei Admin TR @tomas-r Tomás Ruiz Member',
      ],
      opened: '@li-wei',
    })
  })

  test('shows the suspension with its time and its operator and offers Lift, and shows the deletion and offers Suspend', async () => {
    const suspended = await openOrg(SAMPLE_IDS.suspendedOrg)
    const deleted = await openOrg(SAMPLE_IDS.deletedOrg)
    const lines = (view: HTMLElement, wanted: readonly string[]) =>
      wanted.filter((line) => queryByText(line, view) !== null)
    const suspension = [
      'Suspended on 15 Jan at 07:35 by @calummoore',
      'Members can open and read Hexwave, but cannot change it or start a workspace.',
    ]
    const deletion = [
      'Deleted on 12 Jan',
      'Everything of Pinecrest is deleted on 19 Jan, unless an admin restores it.',
    ]
    expect({
      suspended: {
        header: pageText(suspended.view).header,
        notice: lines(suspended.view, suspension),
        members: pageText(suspended.view).body[2],
      },
      deleted: {
        header: pageText(deleted.view).header,
        notice: lines(deleted.view, [...suspension, ...deletion]),
      },
    }).toEqual({
      suspended: {
        header: 'Orgs Hexwave Org Lift suspension',
        notice: suspension,
        members:
          'Members 3 members V @vex-ops Admin KT @kt-null Kai Tanaka Member DK @dana-k Dana Kim · Suspended Member',
      },
      deleted: {
        header: 'Orgs Pinecrest Org Suspend org',
        notice: deletion,
      },
    })
  })

  test('Suspend asks first, sends {}, reads the org again, and shows the cloud computers that are still stopping', async () => {
    const { server, org, view } = await openOrg(SAMPLE_IDS.activeOrg)
    server.json(
      'POST',
      orgSuspensionPath(org.id),
      {
        orgId: org.id,
        suspendedAt: FAKE_TIME,
        pendingWorkspaceIds: ['w-1', 'w-2'],
        pendingBuildIds: ['b-1'],
      } satisfies OrgSuspensionResponse,
      202,
    )
    server.json('GET', operatorOrgPath(org.id), {
      ...org,
      suspension: { suspendedAt: FAKE_TIME, operator: sampleOperator },
    })
    click(byRole('button', 'Suspend org'))
    const dialog = byRole('dialog', 'Suspend Northwind?')
    const question = textOf(dialog.innerHTML)
    click(byRole('button', 'Suspend org', dialog))
    await settle()
    const notice = [
      'Suspended on 15 Jan at 08:00 by @calummoore',
      'Members can open and read Northwind, but cannot change it or start a workspace. 3 cloud computers are still stopping, and each keeps trying on its own.',
    ]
    expect({
      question,
      open: queryByRole('dialog', 'Suspend Northwind?'),
      header: pageText(view).header,
      notice: notice.filter((line) => queryByText(line) !== null),
      requests: await operatorRequests(server),
    }).toEqual({
      question:
        'Suspend Northwind? Every cloud computer and build of Northwind stops now. Members can still open and read it, but they cannot change it or start a workspace. Each unfinished build of Northwind fails, and a lift does not bring it back. A stopped workspace gets no restart near day 14, so its files can be deleted. Lift gives the access back. Cancel Suspend org',
      open: null,
      header: 'Orgs Northwind Org Lift suspension',
      notice,
      requests: [
        `GET ${operatorOrgPath(org.id)}`,
        `POST ${orgSuspensionPath(org.id)} {}`,
        `GET ${operatorOrgPath(org.id)}`,
      ],
    })
  })

  test('a failed suspension shows its error in the question, which stays open, and the page reads nothing', async () => {
    const { server, org } = await openOrg(SAMPLE_IDS.activeOrg)
    server.json(
      'POST',
      orgSuspensionPath(org.id),
      { error: { code: 'internal_error', message: 'The request failed.' } },
      500,
    )
    click(byRole('button', 'Suspend org'))
    const dialog = byRole('dialog', 'Suspend Northwind?')
    click(byRole('button', 'Suspend org', dialog))
    await settle()
    const error = ["Northwind wasn't suspended", 'The request failed.']
    expect({
      error: error.filter((line) => queryByText(line, dialog) !== null),
      requests: await operatorRequests(server),
    }).toEqual({
      error,
      requests: [
        `GET ${operatorOrgPath(org.id)}`,
        `POST ${orgSuspensionPath(org.id)} {}`,
      ],
    })
  })

  test('Lift asks first, sends {} with DELETE, and reads the org again', async () => {
    const { server, org, view } = await openOrg(SAMPLE_IDS.suspendedOrg)
    server.json('DELETE', orgSuspensionPath(org.id), {
      orgId: org.id,
      liftedAt: FAKE_TIME,
      pendingWorkspaceIds: [],
    } satisfies OrgSuspensionLiftResponse)
    server.json('GET', operatorOrgPath(org.id), { ...org, suspension: null })
    click(byRole('button', 'Lift suspension'))
    const dialog = byRole('dialog', 'Lift the suspension of Hexwave?')
    const question = textOf(dialog.innerHTML)
    click(byRole('button', 'Lift suspension', dialog))
    await settle()
    expect({
      question,
      header: pageText(view).header,
      requests: await operatorRequests(server),
    }).toEqual({
      question:
        'Lift the suspension of Hexwave? Members can change Hexwave again, and its workspaces can start again. A workspace that stopped 14 days ago or more may have lost its files. Cancel Lift suspension',
      header: 'Orgs Hexwave Org Suspend org',
      requests: [
        `GET ${operatorOrgPath(org.id)}`,
        `DELETE ${orgSuspensionPath(org.id)} {}`,
        `GET ${operatorOrgPath(org.id)}`,
      ],
    })
  })
})
