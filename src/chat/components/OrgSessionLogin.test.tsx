import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Session } from '../../shared/generated/Session'
import {
  accountWithDefaults,
  type DefaultsOf,
} from '../../app/default-logins.test-support'
import { ACCOUNT_PATHS } from '../../shared/account'
import type { OrgRole } from '../../shared/api'
import { FAKE_IDS, fakeUser, fakeUsers } from '../../test-support/fixtures/core'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import { withSessions } from '../state/linked-kit'
import { newSessionRecord } from '../state/test-kit'
import { renderChat } from './render-kit'

const id = FAKE_IDS.session
const sendOff = /aria-label="Send" aria-disabled="true"/
const linkedTitle = 'Your message starts a new session'

const opus: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
  fast: false,
}

/** A session that took the org login of Acme at its first message. */
function onOrgLogin(available: boolean) {
  return (session: Session): Session => ({
    ...session,
    login: { type: 'org', orgId: FAKE_IDS.org },
    loginAvailable: available,
    loginShared: true,
  })
}

/**
 * The chat of the reader of `role`, whose server names the default logins
 * of `defaults`, with the sessions that `change` gives. `ownLogins` gives
 * the reader the own logins of the fake.
 */
async function chatOf(
  role: OrgRole,
  defaults: DefaultsOf,
  change: (session: Session) => Session,
  ownLogins = false,
) {
  const rendered = await renderChat({
    role,
    setup: (server) => {
      withSessions(server, change)
      server.json(
        'GET',
        ACCOUNT_PATHS.account,
        accountWithDefaults(role, defaults, { ownLogins }),
      )
    },
  })
  rendered.chat.controller.setDraft(id, 'Add tests.')
  return rendered
}

/** What the composer of a chat shows of the login of a message. */
function loginOf(rendered: Awaited<ReturnType<typeof renderChat>>) {
  const text = rendered.text()
  return {
    label: /(\S+)'s login/.exec(text)?.[0] ?? null,
    connect: text.includes('Connect Claude to use Opus 5.5'),
    linked: text.includes(linkedTitle)
      ? text.slice(text.indexOf(linkedTitle)).split('.')[0] + '.'
      : null,
    sendOff: sendOff.test(rendered.markup()),
  }
}

/** The chat of the reader of `role` in a new session of that reader. */
async function newSessionOf(role: OrgRole, defaults: DefaultsOf) {
  const rendered = await renderChat({
    role,
    setup: (server) =>
      server.json(
        'GET',
        ACCOUNT_PATHS.account,
        accountWithDefaults(role, defaults, { ownLogins: role === 'admin' }),
      ),
  })
  const reader = role === 'admin' ? fakeUser : fakeUsers[1]
  const fresh = 'new-session'
  rendered.chat.emit({
    type: 'session.updated',
    session: newSessionRecord(fresh, opus, null, {
      startedBy: senderSnapshot(reader),
      loginAvailable: defaults.claude !== null,
      loginShared: defaults.claude === 'org',
    }),
  })
  await rendered.chat.controller.select(fresh)
  rendered.chat.controller.setDraft(fresh, 'Add tests.')
  return loginOf(rendered)
}

describe('the org login of a session', () => {
  it('names the org login inside the composer box to each member, also to its starter, and asks a member with no login of their own for none', async () => {
    const starter = await chatOf(
      'admin',
      { claude: 'own', codex: 'own' },
      onOrgLogin(true),
      true,
    )
    const member = await chatOf(
      'member',
      { claude: 'org', codex: null },
      onOrgLogin(true),
    )
    expect([loginOf(starter), loginOf(member)]).toEqual([
      { label: "Acme's login", connect: false, linked: null, sendOff: false },
      { label: "Acme's login", connect: false, linked: null, sendOff: false },
    ])
  })

  it("names the org login in the reader's new session when the server names it as the default login, also beside an own login, and asks to connect when no login serves", async () => {
    expect({
      member: await newSessionOf('member', { claude: 'org', codex: null }),
      everyMember: await newSessionOf('admin', { claude: 'org', codex: 'own' }),
      none: await newSessionOf('member', { claude: null, codex: null }),
    }).toEqual({
      member: {
        label: "Acme's login",
        connect: false,
        linked: null,
        sendOff: false,
      },
      everyMember: {
        label: "Acme's login",
        connect: false,
        linked: null,
        sendOff: false,
      },
      none: { label: null, connect: true, linked: null, sendOff: true },
    })
  })

  it('starts a new session on the default login of the reader after an admin removed the org login of the session, and asks to connect when no login serves', async () => {
    const own = await chatOf(
      'member',
      { claude: 'own', codex: 'own' },
      onOrgLogin(false),
      true,
    )
    const none = await chatOf(
      'member',
      { claude: null, codex: null },
      onOrgLogin(false),
    )
    expect([loginOf(own), loginOf(none)]).toEqual([
      {
        label: null,
        connect: false,
        linked: `${linkedTitle} Acme's Claude login is not available.`,
        sendOff: false,
      },
      { label: null, connect: true, linked: null, sendOff: true },
    ])
  })

  it('starts a new session of the starter on the org login when the own login of the session can no longer be used', async () => {
    const starter = await chatOf(
      'admin',
      { claude: 'org', codex: null },
      (session) => ({
        ...session,
        login: { type: 'personal', userId: fakeUser.id },
        loginAvailable: false,
      }),
    )
    expect(loginOf(starter)).toEqual({
      label: "Acme's login",
      connect: false,
      linked: `${linkedTitle} The login for this session is not available.`,
      sendOff: false,
    })
  })
})
