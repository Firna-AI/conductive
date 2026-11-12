import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { seedWorkspace } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  feedbackDraft,
  feedbackFixture,
  feedbackText,
  imageContent,
} from './feedback.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('reads only the signed-in user reply email without an inbox or provider call', async () => {
  const client = await feedbackFixture(harness)
  delete harness.env.FEEDBACK_EMAIL
  await harness.env.DB.prepare(
    'UPDATE users SET primary_verified_email = ? WHERE id = ?',
  )
    .bind('admin-primary@example.com', client.admin.user.id)
    .run()
  const admin = await client.request(client.admin.session)
  expect(admin.status).toBe(200)
  expect(await admin.json()).toEqual({
    replyEmail: 'admin-primary@example.com',
  })
  const member = await client.request()
  expect(member.status).toBe(200)
  expect(await member.json()).toEqual({ replyEmail: null })
  expect(member.headers.get('Cache-Control')).toBe('no-store')
  expect(client.resend.requests).toHaveLength(0)
})

it('sends checked screenshots and verified sender context without client names or media types', async () => {
  const client = await feedbackFixture(harness)
  const workspaceId = await seedWorkspace(
    harness,
    client.org,
    client.member.user,
  )
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'UPDATE users SET primary_verified_email = ? WHERE id = ?',
    ).bind('member-primary@example.com', client.member.user.id),
    harness.env.DB.prepare(
      'UPDATE orgs SET suspended_at = ? WHERE id = ?',
    ).bind(TEST_TIME, client.org.id),
  ])
  const body = feedbackDraft()
  body.context = {
    ...body.context,
    orgId: client.org.id,
    workspaceId,
    desktop: true,
  }
  const screenshots = ['png', 'jpeg', 'gif', 'webp'] as const
  const response = await client.request(undefined, {
    method: 'POST',
    headers: { 'User-Agent': 'FeedbackBrowser/1.0' },
    body: JSON.stringify({
      ...body,
      userId: 'forged-user',
      replyEmail: 'forged@example.com',
      pageUrl: 'https://private.example/secret-file',
      orgName: 'Private org',
      screenshots: screenshots.map((kind) => ({
        content: imageContent(kind),
        name: 'dangerous.html',
        mediaType: 'text/html',
      })),
    }),
  })
  expect(response.status).toBe(204)
  expect(await response.text()).toBe('')
  expect(client.resend.deliveries.size).toBe(1)
  const mail = client.resend.requests[0]
  expect(mail.request.url).toBe('https://api.resend.com/emails')
  expect(mail.request.method).toBe('POST')
  expect(mail.request.redirect).toBe('manual')
  expect(mail.request.headers.get('Authorization')).toBe(
    'Bearer test-resend-secret',
  )
  expect(mail.request.headers.get('User-Agent')).toBe('Conductive')
  expect(JSON.parse(mail.body)).toEqual({
    from: 'Conductive feedback <feedback@mail.conductive.build>',
    to: ['feedback-team@example.com'],
    subject: 'Feedback from member',
    text: feedbackText(
      [
        'Org ID: members-org',
        'Org: https://app.conductive.test/operator/orgs/members-org',
        'Workspace ID: workspace-one',
      ],
      true,
      'FeedbackBrowser/1.0',
    ),
    reply_to: 'member-primary@example.com',
    attachments: [
      {
        filename: 'screenshot-1.png',
        content_type: 'image/png',
        content: imageContent('png'),
      },
      {
        filename: 'screenshot-2.jpg',
        content_type: 'image/jpeg',
        content: imageContent('jpeg'),
      },
      {
        filename: 'screenshot-3.gif',
        content_type: 'image/gif',
        content: imageContent('gif'),
      },
      {
        filename: 'screenshot-4.webp',
        content_type: 'image/webp',
        content: imageContent('webp'),
      },
    ],
  })
})

it('delivers once after a lost reply and a later retry, and sends changed drafts with bounded new keys', async () => {
  const client = await feedbackFixture(harness)
  const draft = { ...feedbackDraft(), draftId: 'long-draft-id/'.repeat(100) }
  client.resend.loseReply = true
  expect((await client.send(draft)).status).toBe(502)
  expect(client.resend.deliveries.size).toBe(1)
  client.setTime(TEST_TIME + 60_000)
  expect((await client.send(draft)).status).toBe(204)
  expect(client.resend.requests[1].body).toBe(client.resend.requests[0].body)
  expect(client.resend.requests[1].key).toBe(client.resend.requests[0].key)
  expect(client.resend.deliveries.size).toBe(1)
  expect(JSON.parse(client.resend.requests[0].body)).toEqual({
    from: 'Conductive feedback <feedback@mail.conductive.build>',
    to: ['feedback-team@example.com'],
    subject: 'Feedback from member',
    text: feedbackText(),
  })
  expect(
    (await client.send({ ...draft, text: 'The terminal now stays open.' }))
      .status,
  ).toBe(204)
  expect((await client.send({ ...draft, draftId: 'new-draft' })).status).toBe(
    204,
  )
  expect((await client.send(draft, client.admin.session)).status).toBe(204)
  expect(client.resend.deliveries.size).toBe(4)
  expect(new Set(client.resend.requests.map(({ key }) => key)).size).toBe(4)
  for (const { key } of client.resend.requests)
    expect(key).toMatch(
      /^feedback\/[A-Za-z0-9_-]{43}\/[A-Za-z0-9_-]{43}\/[A-Za-z0-9_-]{43}$/,
    )
})

it('omits unreachable orgs and workspaces and still sends the remaining feedback', async () => {
  const client = await feedbackFixture(harness)
  const workspaceId = await seedWorkspace(
    harness,
    client.org,
    client.admin.user,
  )
  await harness.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(client.org.id, client.member.user.id)
    .run()
  const draft = feedbackDraft()
  draft.context = { ...draft.context, orgId: client.org.id, workspaceId }
  expect((await client.send(draft)).status).toBe(204)
  expect(JSON.parse(client.resend.requests[0].body)).toMatchObject({
    text: feedbackText(),
  })
  const foreignOrg = {
    id: 'foreign-org',
    name: 'Private foreign org',
    role: 'admin' as const,
  }
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
    ).bind(foreignOrg.id, foreignOrg.name, client.other.user.id, TEST_TIME),
    harness.env.DB.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
    ).bind(foreignOrg.id, client.other.user.id, TEST_TIME),
  ])
  const foreignWorkspace = await seedWorkspace(
    harness,
    foreignOrg,
    client.other.user,
    'foreign-workspace',
  )
  const wrongWorkspace = {
    ...draft,
    draftId: 'wrong-workspace',
    context: { ...draft.context, workspaceId: foreignWorkspace },
  }
  expect((await client.send(wrongWorkspace, client.admin.session)).status).toBe(
    204,
  )
  expect(client.resend.requests[1].body).toContain('Org ID: members-org')
  expect(client.resend.requests[1].body).not.toContain(foreignWorkspace)
  expect(client.resend.requests[1].body).not.toContain('Workspace ID:')
  expect(
    (
      await client.send({
        ...draft,
        draftId: 'no-org',
        context: { ...draft.context, orgId: null },
      })
    ).status,
  ).toBe(204)
  expect(client.resend.requests[2].body).not.toContain(workspaceId)
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
    .bind(TEST_TIME, client.org.id)
    .run()
  expect(
    (
      await client.send(
        { ...draft, draftId: 'deleted-org' },
        client.admin.session,
      )
    ).status,
  ).toBe(204)
  expect(client.resend.requests[3].body).not.toContain(client.org.id)
  expect(client.resend.requests[3].body).not.toContain(workspaceId)
  expect(client.resend.deliveries.size).toBe(4)
})
