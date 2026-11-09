import { describe, expect, it } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import type { OrgRole } from '../../shared/api'
import { membersPath } from '../../shared/members'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { loginGone, withSessions } from '../state/linked-kit'
import { renderChat, textOf } from './render-kit'

const id = FAKE_IDS.session
const sendOff = /aria-label="Send" aria-disabled="true"/
/** The end of every login label, such as "Cal's login". */
const loginLabel = "'s login"

/** The words of the composer up to Send, so of the box and its bar. */
function beforeSend(markup: string): string {
  return textOf(markup.slice(0, markup.indexOf('aria-label="Send"')))
}

/** The account of the reader of a role, with no agent login. */
function noLogins(role: OrgRole) {
  return { ...coreFixtures(role).account, agentLogins: [] }
}

/** The record of the first session, as the fake gives it. */
const firstRecord = () => workspaceFixtures().sessions.sessions[0]

describe('the login of a session', () => {
  it("names the starter's login inside the composer box to another member, also after the starter left the org, and no login to the starter", async () => {
    const own = await renderChat({})
    expect(own.text()).not.toContain(loginLabel)
    const member = await renderChat({ role: 'member' })
    expect(beforeSend(member.markup())).toContain("Cal's login")
    const { members } = coreFixtures('member')
    const left = await renderChat({
      role: 'member',
      setup: (server) =>
        server.json('GET', membersPath(FAKE_IDS.org), {
          ...members,
          members: members.members.filter((item) => item.user.id !== 'cal'),
        }),
    })
    expect(left.text()).toContain("Cal's login")
  })

  it('follows the session record, not an older account, for the login of its own starter', async () => {
    const revoked = await renderChat({})
    revoked.chat.controller.setDraft(id, 'Add tests.')
    revoked.chat.emit({
      type: 'session.updated',
      session: loginGone(firstRecord()),
    })
    expect(revoked.text()).toContain('Connect Claude to use Opus 5.5')
    expect(revoked.markup()).toMatch(sendOff)
    const restored = await renderChat({
      setup: (server) =>
        server.json('GET', ACCOUNT_PATHS.account, noLogins('admin')),
    })
    restored.chat.controller.setDraft(id, 'Add tests.')
    expect(restored.text()).not.toContain('Connect Claude')
    expect(restored.markup()).not.toMatch(sendOff)
  })

  it("lets another member send on the starter's login, with no Connect notice, when the member has no own login", async () => {
    const member = await renderChat({
      role: 'member',
      setup: (server) =>
        server.json('GET', ACCOUNT_PATHS.account, noLogins('member')),
    })
    member.chat.controller.setDraft(id, 'Add tests.')
    expect(member.text()).toContain("Cal's login")
    expect(member.text()).not.toContain('Connect Claude')
    expect(member.markup()).not.toMatch(sendOff)
  })

  it('says before Send that a message starts a new session, names no login, and offers no steering of the running turn', async () => {
    const gone = await renderChat({
      role: 'member',
      conversation: 'running',
      setup: (server) => withSessions(server, loginGone),
    })
    gone.chat.controller.setDraft(id, 'Show a loading state.')
    expect(gone.text()).toContain(
      "Your message starts a new session Cal's Claude login is not available.",
    )
    expect(gone.text()).not.toContain(loginLabel)
    expect(gone.text()).toContain('Stop')
    expect(gone.text()).not.toContain('The agent reads this at its next step.')
    expect(gone.markup()).toContain('placeholder="Message the agent"')
    expect(gone.markup()).not.toMatch(sendOff)
  })

  it("names nobody for an older record, and asks for the reader's own login before a new session", async () => {
    const older = await renderChat({
      role: 'member',
      setup: (server) =>
        withSessions(server, (session) => ({
          ...session,
          startedBy: null,
          loginAvailable: false,
        })),
    })
    expect(older.text()).toContain(
      'Your message starts a new session The login for this session is not available.',
    )
    expect(older.text()).not.toContain(loginLabel)
    const noLogin = await renderChat({
      role: 'member',
      setup: (server) => {
        withSessions(server, loginGone)
        server.json('GET', ACCOUNT_PATHS.account, noLogins('member'))
      },
    })
    noLogin.chat.controller.setDraft(id, 'Add tests.')
    expect(noLogin.text()).toContain('Connect Claude to use Opus 5.5')
    expect(noLogin.text()).not.toContain('Your message starts a new session')
    expect(noLogin.markup()).toMatch(sendOff)
  })
})
