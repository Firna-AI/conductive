import { expect, it, vi } from 'vitest'

import type { HttpFetch } from './env'
import { createInvitationMailer, invitationLink } from './invitation-mailer'

const invitation = {
  id: 'invite-1',
  email: 'mira@example.com',
  orgName: 'Example org',
  invitedBy: 'Cal',
  link: invitationLink('https://app.conductive.build', 'invite-1'),
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

it('reports provider refusal and missing production credentials without logging delivery', async () => {
  const refused = createInvitationMailer(
    { ...env(), RESEND_API_KEY: 'secret' },
    async () => new Response(null, { status: 403 }),
  )
  await expect(refused.send(invitation)).rejects.toMatchObject({
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
    ).send({ ...invitation, link: invitationLink(origin, invitation.id) })
    expect(requests).toHaveLength(0)
    expect(messages).toEqual([
      'Cal invited mira@example.com to Example org: http://127.0.0.1:5173/?invite=invite-1',
    ])
  } finally {
    log.mockRestore()
  }
})
