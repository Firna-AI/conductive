import { expect, it } from 'vitest'
import type { Session } from '../generated/Session'
import type { SecretRequest } from '../secret-requests'
import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'
import type { SessionEnvelopeInput } from './session-events'

function request(id: string, createdAt: number): SecretRequest {
  return {
    id,
    workspaceId: 'workspace',
    sessionId: 'session',
    turnId: 'finished',
    sender: {
      id: 'cal',
      githubLogin: 'cal',
      displayName: 'Cal',
      avatarUrl: null,
    },
    secrets: [{ name: id, secretId: id, description: `Publish with ${id}.` }],
    reason: 'Publish the app.',
    command: `deploy --secret ${id}`,
    state: 'late',
    late: true,
    createdAt,
    updatedAt: 90_000,
    answeredBy: null,
    lifetime: null,
    endedBy: null,
    notice: null,
  }
}

function updated(
  request: SecretRequest,
  eventNumber: number,
): SessionEnvelopeInput {
  return {
    eventNumber,
    occurredAt: request.updatedAt,
    event: { type: 'secrets.request.updated', sessionId: 'session', request },
  }
}

it('keeps late requests in creation order when answers and older history arrive', () => {
  const { builder } = markdownFixture()
  const first = request('FIRST', 3_500)
  const second = request('SECOND', 3_500)
  builder.merge([updated(second, 102), updated(first, 101)])
  const answered: SecretRequest = {
    ...first,
    state: 'denied',
    answeredBy: first.sender,
    updatedAt: 91_000,
  }
  builder.merge([updated(answered, 103)])
  builder.merge([updated(first, 100)])

  const concise = builder.render('concise')
  expect(concise.indexOf('Secrets: `FIRST`')).toBeGreaterThan(-1)
  expect(concise.indexOf('Secrets: `SECOND`')).toBeGreaterThan(-1)
  expect(concise.indexOf('Secrets: `FIRST`')).toBeLessThan(
    concise.indexOf('Secrets: `SECOND`'),
  )
  expect(concise).toContain('Cal denied the request. The command did not run.')
  expect(concise).toContain(
    'The agent stopped waiting. Allow sends it a message.',
  )
  expect(concise.match(/Secrets: `FIRST`/g)).toHaveLength(1)
  expect(concise).toContain('Publish with FIRST.')
})

it('copies an allowed run once, folds it with its turn, and keeps the late notice visible', () => {
  const { builder } = markdownFixture()
  const pending = request('TOKEN', 3_500)
  builder.merge([
    updated({ ...pending, state: 'allowed', late: false }, 101),
    {
      eventNumber: 102,
      occurredAt: 3_600,
      event: {
        type: 'secrets.run',
        sessionId: 'session',
        turnId: 'finished',
        id: pending.id,
        names: ['TOKEN'],
        command: pending.command,
        reason: pending.reason,
        grants: [{ name: 'TOKEN', grant: 'session' }],
      },
    },
    {
      eventNumber: 103,
      occurredAt: 3_700,
      event: {
        type: 'secrets.notice',
        sessionId: 'session',
        turnId: 'finished',
        requestId: 'OTHER',
        text: 'App: Cal made OTHER available in this session.',
      },
    },
  ])
  const full = builder.render('full')
  expect(full.match(/Secrets: `TOKEN`/g)).toHaveLength(1)
  expect(full).toContain('Allowed: `TOKEN` · Allowed for this session.')
  const concise = builder.render('concise')
  expect(concise).not.toContain('Secrets: `TOKEN`')
  expect(concise).toContain('App: Cal made OTHER available in this session.')
})

it('copies the login recovery line when a late answer cannot start a turn', () => {
  const { document } = markdownFixture()
  const pending = request('TOKEN', 3_500)
  const logins: Session['login'][] = [
    undefined,
    { type: 'personal', userId: pending.sender.id },
  ]
  for (const login of logins) {
    const builder = new SessionMarkdown({
      ...document,
      session: { ...document.session, login },
      commands: [],
    })
    builder.merge([
      updated(
        {
          ...pending,
          state: 'allowed',
          answeredBy: pending.sender,
          notice: { state: 'not-sent', reason: 'login-unavailable' },
        },
        101,
      ),
    ])
    expect(builder.render('concise')).toContain(
      'The session starter must connect the login again and send a message so the agent learns of this.',
    )
  }
})

it('names an admin reconnecting the saved org login in late-answer transcripts', () => {
  const { document } = markdownFixture()
  const orgDocument = {
    ...document,
    orgName: 'Acme [Ops]',
    session: {
      ...document.session,
      choice: { ...document.session.choice, agent: 'claude' },
      login: { type: 'org', orgId: document.linkContext.orgId },
      loginAvailable: false,
      activeTurnId: null,
      activeTurnStartedAt: null,
    } satisfies Session,
    commands: [],
  }
  const builder = new SessionMarkdown(orgDocument)
  const pending = request('TOKEN', 3_500)
  builder.merge([
    updated(
      {
        ...pending,
        state: 'allowed',
        answeredBy: pending.sender,
        notice: { state: 'not-sent', reason: 'login-unavailable' },
      },
      101,
    ),
  ])
  for (const detail of ['concise', 'full'] as const) {
    const markdown = builder.render(detail)
    expect(markdown).toContain(
      "An admin must connect Acme \\[Ops\\]'s Claude login again. The agent learns of this at the next message in this session.",
    )
    expect(markdown).not.toContain('The session starter must connect')
  }
})
