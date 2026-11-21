import { expect, it, vi } from 'vitest'

import { createEmailMessages } from './email-messages'
import type { HttpFetch } from './env'
import { createInvitationMailer } from './invitation-mailer'

const invitation = {
  id: 'invite-1',
  email: 'mira@example.com',
  orgName: 'Example org',
  invitedBy: 'Cal',
  link: createEmailMessages('https://app.conductive.build').invitationLink(
    'invite-1',
  ),
}

function env(origin = 'https://app.conductive.build') {
  return {
    APP_ORIGIN: origin,
  }
}

it('sends a plain text invitation through Resend with the secret and a stable delivery key', async () => {
  const requests: Request[] = []
  const fetch: HttpFetch = async (request) => {
    requests.push(request)
    return Response.json({ id: 'resend-email-1' })
  }
  const mailer = createInvitationMailer(
    { ...env(), RESEND_API_KEY: 'test-resend-secret' },
    fetch,
  )
  await mailer.send(invitation)
  await mailer.send(invitation)
  await mailer.send({
    ...invitation,
    orgName: 'Renamed org',
    invitedBy: 'Priya',
  })
  expect(requests).toHaveLength(3)
  const request = requests[0]
  expect(request.url).toBe('https://api.resend.com/emails')
  expect(request.method).toBe('POST')
  expect(request.redirect).toBe('manual')
  expect(request.headers.get('User-Agent')).toBe('Conductive')
  expect(request.headers.get('Authorization')).toBe('Bearer test-resend-secret')
  expect(request.headers.get('Idempotency-Key')).toBe(
    requests[1].headers.get('Idempotency-Key'),
  )
  expect(request.headers.get('Idempotency-Key')).not.toBe(
    requests[2].headers.get('Idempotency-Key'),
  )
  expect(await request.json()).toEqual({
    from: 'Conductive <invites@mail.conductive.build>',
    to: ['mira@example.com'],
    subject: 'Join Example org on Conductive',
    text: 'Cal invited you to join Example org on Conductive.\n\nSign in with GitHub and accept your invitation:\nhttps://app.conductive.build/?invite=invite-1',
  })
})

it('reports provider refusal and missing production credentials with safe diagnostics', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const refused = createInvitationMailer(
    { ...env(), RESEND_API_KEY: 'secret' },
    async () =>
      Response.json(
        { name: 'validation_error', message: 'synthetic-private-mail-canary' },
        { status: 403 },
      ),
  )
  try {
    await expect(refused.send(invitation)).rejects.toMatchObject({
      status: 502,
      code: 'invite_email_failed',
    })
    const canary = 'synthetic-private-mail-canary'
    const unknown = createInvitationMailer(
      { ...env(), RESEND_API_KEY: canary },
      async () =>
        Response.json(
          {
            name: canary,
            code: 'validation_error',
            message: canary,
            body: canary,
            key: canary,
          },
          { status: 403 },
        ),
    )
    await expect(
      unknown.send({
        ...invitation,
        email: `${canary}@example.com`,
        id: canary,
        link: canary,
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: 'invite_email_failed',
    })
    let calls = 0
    const missing = createInvitationMailer(env(), async () => {
      calls++
      return new Response(null)
    })
    await expect(missing.send(invitation)).rejects.toMatchObject({
      status: 502,
      code: 'invite_email_failed',
    })
    expect(calls).toBe(0)
    expect(warn.mock.calls).toEqual([
      [
        {
          kind: 'invitation_email_delivery_failed',
          message:
            'Invitation email delivery failed. The invitation remains saved.',
          error: {
            kind: 'mail',
            reason: 'provider_refused',
            status: 403,
            code: 'validation_error',
            errorType: null,
          },
        },
      ],
      [
        {
          kind: 'invitation_email_delivery_failed',
          message:
            'Invitation email delivery failed. The invitation remains saved.',
          error: {
            kind: 'mail',
            reason: 'provider_refused',
            status: 403,
            code: 'unknown',
            errorType: null,
          },
        },
      ],
      [
        {
          kind: 'invitation_email_delivery_failed',
          message:
            'Invitation email delivery failed. The invitation remains saved.',
          error: {
            kind: 'mail',
            reason: 'not_configured',
            status: null,
            code: null,
            errorType: null,
          },
        },
      ],
    ])
  } finally {
    warn.mockRestore()
  }
})

it('logs the invitation destination and app link through the development mailer', async () => {
  const messages: string[] = []
  const requests: Request[] = []
  const log = vi
    .spyOn(console, 'info')
    .mockImplementation((message: string) => {
      messages.push(message)
    })
  const origin = 'http://127.0.0.1:5173'
  const fetch: HttpFetch = async (request) => {
    requests.push(request)
    return Response.json({ id: 'fake-email-1' })
  }
  try {
    await createInvitationMailer(
      { ...env(origin), RESEND_API_KEY: 'local-resend-secret' },
      fetch,
    ).send({
      ...invitation,
      link: createEmailMessages(origin).invitationLink(invitation.id),
    })
    expect(requests).toHaveLength(0)
    expect(messages).toEqual([
      'Cal invited mira@example.com to Example org: http://127.0.0.1:5173/?invite=invite-1',
    ])
  } finally {
    log.mockRestore()
  }
})
