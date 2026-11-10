import { describe, expect, test } from 'vitest'
import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
  type PendingOrgInvite,
} from '../shared/members'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_TIME, fakeUsers } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import {
  flushMicrotasks,
  HeldRequests,
  requestLines,
  testServices,
} from './test-kit'

const invite: PendingOrgInvite = {
  id: 'invite-globex',
  email: 'cal@example.com',
  createdAt: FAKE_TIME - 3_600_000,
  orgId: 'globex',
  orgName: 'Globex',
}

/** The app over the fake API, with the reads of the invitations held. */
async function startedWithHeldInvites() {
  const server = new FakeApiServer()
  server.json('GET', PENDING_ORG_INVITES_PATH, { invites: [invite] })
  const held = new HeldRequests(server)
  const app = new AppModel(testServices(server, { fetch: held.fetch }))
  await app.start()
  return { server, held, app }
}

describe('the invitations of the signed-in person', () => {
  test('a sign-in reads and accepts none, and only the first show of Home reads them', async () => {
    const { server, app } = await startedWithHeldInvites()
    const signIn = requestLines(server)
    app.invitations.open()
    await flushMicrotasks()
    app.invitations.open()
    await flushMicrotasks()
    expect({
      signIn: signIn.filter((line) => line.includes(PENDING_ORG_INVITES_PATH)),
      reads: requestLines(server).filter(
        (line) => line === `GET ${PENDING_ORG_INVITES_PATH}`,
      ).length,
      accepts: requestLines(server).filter((line) => line.startsWith('POST ')),
      list: app.invitations.state.get().list,
    }).toEqual({
      signIn: [],
      reads: 1,
      accepts: [],
      list: { state: 'ready', value: [invite] },
    })
  })

  test('the answers for the person before change nothing after another person signs in', async () => {
    const { server, held, app } = await startedWithHeldInvites()
    held.hold('GET', PENDING_ORG_INVITES_PATH)
    app.invitations.open()
    server.json('POST', acceptOrgInvitePath(invite.id), {
      org: { id: 'globex', name: 'Globex', role: 'member' },
    })
    held.hold('POST', acceptOrgInvitePath(invite.id))
    const opened: string[] = []
    const accepting = app.invitations.accept(invite, (org) =>
      opened.push(org.id),
    )
    server.signIn(fakeUsers[1])
    await app.start()
    held.release('GET', PENDING_ORG_INVITES_PATH)
    held.release('POST', acceptOrgInvitePath(invite.id))
    await accepting
    await flushMicrotasks()
    expect({
      state: app.invitations.state.get(),
      opened,
      orgs: app.orgs.get().map((org) => org.id),
    }).toEqual({
      state: { list: null, passed: false, accepting: null, failure: null },
      opened: [],
      orgs: ['acme', 'futex', 'firna'],
    })
  })
})
