// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { API_PATHS } from '../../shared/api'
import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
  type PendingOrgInvite,
} from '../../shared/members'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'
import { startedApp, textOf } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

function invite(orgId: string, orgName: string): PendingOrgInvite {
  return {
    id: `invite-${orgId}`,
    email: 'cal@example.com',
    createdAt: FAKE_TIME - 3_600_000,
    orgId,
    orgName,
  }
}

const acme = invite('acme', 'Acme')
const globex = invite('globex', 'Globex')

/** A person whom Acme invited: Futex and Firna are their orgs so far. */
function invitedToAcme(server: FakeApiServer) {
  const { orgs } = coreFixtures().orgs
  server.json('GET', API_PATHS.orgs, {
    orgs: orgs.filter((org) => org.id !== 'acme'),
  })
  server.json('GET', PENDING_ORG_INVITES_PATH, { invites: [acme, globex] })
}

/** The whole app at the link of an invitation email. */
async function openLink(server: FakeApiServer) {
  const app = await startedApp(server)
  const navigation = memoryNavigation(`${routes.home()}?invite=${acme.id}`)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  return { app, navigation, view }
}

/** The rows of the invitations, each as a person reads it. */
async function invitationRows(view: HTMLElement): Promise<string[]> {
  const list = await waitFor(
    () => queryByRole('list', 'Invitations', view),
    'the invitations',
  )
  return Array.from(list.querySelectorAll('li'), (row) => textOf(row.innerHTML))
}

/** The writes that the app sent, from the request with the index `from`. */
function writes(server: FakeApiServer, from = 0): string[] {
  return requestLines(server)
    .slice(from)
    .filter((line) => !line.startsWith('GET '))
}

describe('the invitations at the address of the app', () => {
  test('the link of an invitation email shows the invitations, and only Accept invitation joins and opens its org', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    invitedToAcme(server)
    server.json('POST', acceptOrgInvitePath(acme.id), {
      org: { id: 'acme', name: 'Acme', initials: 'AC', role: 'member' },
    })
    const { app, navigation, view } = await openLink(server)
    // The sign-in and the list accept nothing.
    expect({
      rows: await invitationRows(view),
      writes: writes(server),
    }).toEqual({
      rows: [
        'Acme Sent to cal@example.com Accept invitation',
        'Globex Sent to cal@example.com Accept invitation',
      ],
      writes: [],
    })
    await press(byRole('button', 'Accept the invitation to Acme', view))
    await waitFor(
      () => navigation.href() === routes.org('acme'),
      'the org of the accepted invitation',
    )
    expect({
      accepted: writes(server),
      orgs: app.orgs.get().map((org) => `${org.id} ${org.role}`),
    }).toEqual({
      accepted: [`POST ${acceptOrgInvitePath(acme.id)}`],
      orgs: ['futex admin', 'firna admin', 'acme member'],
    })
  })

  test('Continue to workspaces accepts nothing and opens the app as usual', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    invitedToAcme(server)
    const { navigation, view } = await openLink(server)
    await invitationRows(view)
    await press(byRole('button', 'Continue to workspaces', view))
    await waitFor(
      () => navigation.href() === routes.org('futex'),
      'the first org of the person',
    )
    expect(writes(server)).toEqual([])
  })

  test('a failed acceptance keeps the list, and Try again accepts again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    invitedToAcme(server)
    const failure = {
      error: {
        code: 'invite_not_found',
        message: 'The invite is not available.',
      },
    }
    server.json('POST', acceptOrgInvitePath(acme.id), failure, 404)
    const { navigation, view } = await openLink(server)
    await invitationRows(view)
    await press(byRole('button', 'Accept the invitation to Acme', view))
    const notice = await waitFor(
      () => queryByText("The invitation to Acme wasn't accepted", view),
      'the failed acceptance',
    )
    const shown = {
      address: navigation.href(),
      notice: textOf(notice.parentElement?.innerHTML ?? ''),
      rows: await invitationRows(view),
    }
    server.json('POST', acceptOrgInvitePath(acme.id), {
      org: { id: 'acme', name: 'Acme', initials: 'AC', role: 'member' },
    })
    await press(byRole('button', 'Try again', view))
    await waitFor(
      () => navigation.href() === routes.org('acme'),
      'the org of the accepted invitation',
    )
    expect(shown).toEqual({
      address: `${routes.home()}?invite=${acme.id}`,
      notice: expect.stringContaining(
        "The invitation to Acme wasn't accepted The invite is not available.",
      ) as unknown,
      rows: [
        'Acme Sent to cal@example.com Accept invitation',
        'Globex Sent to cal@example.com Accept invitation',
      ],
    })
  })

  test('a list that did not load keeps the person signed in, with Try again and Continue to workspaces', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const failure = {
      error: { code: 'internal', message: 'The request failed.' },
    }
    server.json('GET', PENDING_ORG_INVITES_PATH, failure, 500)
    const { app, view } = await openLink(server)
    await waitFor(
      () => queryByText("The invitations didn't load", view),
      'the failed list',
    )
    const failed = {
      boot: app.boot.get().state,
      continue: queryByRole('button', 'Continue to workspaces', view) !== null,
    }
    server.json('GET', PENDING_ORG_INVITES_PATH, { invites: [globex] })
    await press(byRole('button', 'Try again', view))
    expect({ failed, rows: await invitationRows(view) }).toEqual({
      failed: { boot: 'ready', continue: true },
      rows: ['Globex Sent to cal@example.com Accept invitation'],
    })
  })

  test('without invitations, the address of the app opens the first org', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { navigation } = await openLink(server)
    await waitFor(
      () => navigation.href() === routes.org('acme'),
      'the first org of the person',
    )
    expect(requestLines(server)).toContain(`GET ${PENDING_ORG_INVITES_PATH}`)
  })
})
