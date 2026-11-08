// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { requestLines } from '../../app/test-kit'
import type { OrgRole } from '../../shared/api'
import { membersPath } from '../../shared/members'
import { leaveOrgPath } from '../../shared/orgs'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OverlayHost } from '../ui/Overlay'
import { OrgSettingsScreen } from './OrgSettingsScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const leavePath = leaveOrgPath(FAKE_IDS.org)

/**
 * Opens General of suspended Acme, presses Leave org, and confirms. The
 * frame of the app draws each dialog in its overlay host, so the screen
 * mounts inside one.
 */
async function leave(app: AppModel): Promise<HTMLElement> {
  const boot = app.boot.get()
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (boot.state !== 'ready' || !org) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OverlayHost>
      <OrgSettingsScreen org={org} tab="general" user={boot.user} />
    </OverlayHost>,
  )
  await settle()
  click(byRole('button', 'Leave org', view))
  await settle()
  const dialog = byRole('dialog', 'Leave Acme?')
  click(byRole('button', 'Leave org', dialog))
  await settle()
  return dialog
}

/** The fake API of suspended Acme for a person with this role. */
function suspendedServer(role: OrgRole): FakeApiServer {
  const server = new FakeApiServer({ role })
  serveSuspendedAcme(server, role)
  return server
}

describe('Leave org in a suspended org', () => {
  test('a member leaves: the question counts their workspaces, and the org leaves their list', async () => {
    const server = suspendedServer('member')
    const app = await startedApp(server)
    const dialog = await leave(app)
    expect({
      question: dialog.textContent?.includes(
        'You can no longer open Acme or read its chats. Your 2 workspaces stay in Acme.',
      ),
      leaves: requestLines(server).filter(
        (line) => line === `POST ${leavePath}`,
      ).length,
      listed: app.orgs.get().some((item) => item.id === FAKE_IDS.org),
    }).toEqual({ question: true, leaves: 1, listed: false })
  })

  test('the last-admin refusal of a leave names no step that the suspended org refuses', async () => {
    const server = suspendedServer('admin')
    // The members list another admin, whom the server counts as suspended.
    const { members } = coreFixtures()
    server.json('GET', membersPath(FAKE_IDS.org), {
      ...members,
      members: members.members.map((member) =>
        member.user.id === 'priya' ? { ...member, role: 'admin' } : member,
      ),
    })
    server.json(
      'POST',
      leavePath,
      {
        error: {
          code: 'last_admin',
          message:
            'Make another member whose account is not suspended an admin first.',
        },
      },
      409,
    )
    const app = await startedApp(server)
    const text = (await leave(app)).textContent ?? ''
    expect({
      refusal: text.includes(
        "You can't leave AcmeYou are its only active admin.",
      ),
      refusedStep: text.includes('Make another member'),
      listed: app.orgs.get().some((item) => item.id === FAKE_IDS.org),
    }).toEqual({ refusal: true, refusedStep: false, listed: true })
  })
})
