// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { HeldRequests, requestLines } from '../../app/test-kit'
import type { OrgRole } from '../../shared/api'
import { membersPath } from '../../shared/members'
import { leaveOrgPath } from '../../shared/orgs'
import { workspacesPath } from '../../shared/workspaces'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  fakeUsers,
} from '../../test-support/fixtures/core'
import { removedWorkspace } from '../../test-support/fixtures/removed-workspace'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { click, mountScreen, press, settle } from '../test-mount'
import { startedApp, type ScreenOptions } from '../test-render'
import { OverlayHost } from '../ui/Overlay'
import { OrgTabContent } from './OrgTabContent'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const leavePath = leaveOrgPath(FAKE_IDS.org)

/**
 * Opens General of suspended Acme, presses Leave org, and confirms. The
 * frame of the app draws each dialog in its overlay host, so the screen
 * mounts inside one.
 */
async function leave(
  app: AppModel,
  options: ScreenOptions = {},
): Promise<HTMLElement> {
  const boot = app.boot.get()
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (boot.state !== 'ready' || !org) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OverlayHost>
      <OrgTabContent org={org} tab="general" user={boot.user} />
    </OverlayHost>,
    options,
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
  test.each(['desktop', 'phone'] as const)(
    'keeps the same question open on %s through every dismissal while leaving, then shows the failure and permits dismissal',
    async (viewport) => {
      holdAnimationFrames()
      const server = suspendedServer('member')
      const message = 'The leave request failed. Try again.'
      server.json(
        'POST',
        leavePath,
        { error: { code: 'internal_error', message } },
        500,
      )
      const held = new HeldRequests(server)
      held.hold('POST', leavePath)
      const app = await startedApp(server, { fetch: held.fetch })
      const question = await leave(app, { viewport })
      const cancel = byRole('button', 'Cancel', question)
      const cancelDisabled =
        cancel.hasAttribute('disabled') ||
        cancel.getAttribute('aria-disabled') === 'true'
      click(cancel)
      await settle()
      const afterCancel = queryByRole('dialog', 'Leave Acme?') === question
      press(question, 'Escape')
      await settle()
      const afterEscape = queryByRole('dialog', 'Leave Acme?') === question
      act(() => {
        document.body.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true }),
        )
      })
      await settle()
      const afterOutside = queryByRole('dialog', 'Leave Acme?') === question
      held.release('POST', leavePath)
      await settle()
      const failure = {
        sameQuestion: queryByRole('dialog', 'Leave Acme?') === question,
        title: queryByText("You didn't leave Acme", question) !== null,
        message: queryByText(message, question) !== null,
      }
      expect({
        cancelDisabled,
        afterCancel,
        afterEscape,
        afterOutside,
        failure,
        listed: app.orgs.get().some((item) => item.id === FAKE_IDS.org),
        leaves: requestLines(server).filter(
          (line) => line === `POST ${leavePath}`,
        ).length,
      }).toEqual({
        cancelDisabled: true,
        afterCancel: true,
        afterEscape: true,
        afterOutside: true,
        failure: { sameQuestion: true, title: true, message: true },
        listed: true,
        leaves: 1,
      })
      click(byRole('button', 'Cancel', question))
      await settle()
      expect(queryByRole('dialog', 'Leave Acme?')).toBeNull()
    },
  )

  test('a member leaves: the question counts their workspaces in the list, without a removed one, and the org leaves their list', async () => {
    const server = suspendedServer('member')
    // Priya also owns a workspace whose 14 days ended, which left the list.
    const priya = fakeUsers.find((user) => user.id === 'priya')
    if (!priya) throw new Error('The fixtures have no Priya.')
    server.json('GET', workspacesPath(FAKE_IDS.org), {
      workspaces: [
        ...workspaceFixtures().workspaces.workspaces,
        { ...removedWorkspace(), id: 'old-banner', owner: priya },
      ],
    })
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
