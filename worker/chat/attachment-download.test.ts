import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'
import { createApp } from '../application'
import { errorResponse } from '../http'
import { hash } from '../security/crypto'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { attachmentFixture, FILE_BYTES } from './attachment.test-support'
import { createAttachmentDownload } from './attachment-download-data'
import {
  ATTACHMENT_DOWNLOAD_PATH,
  handleAttachmentDownload,
} from './attachment-download'
import { selectAttachmentComputer } from './attachment-owner.test-support'
import { cleanupDraftAttachments } from './attachment-cleanup'
import { WORKSPACE_ID } from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

async function downloadFixture() {
  const fixture = await attachmentFixture(harness)
  await selectAttachmentComputer(harness, 'download-sandbox')
  const file = await fixture.upload()
  const session = await fixture.createSession()
  expect(
    (await fixture.sendAttachment(session.id, 'download-message', [file.id]))
      .status,
  ).toBe(202)
  const mint = (now = TEST_TIME) =>
    createAttachmentDownload(
      harness.env.DB,
      {
        attachmentId: file.id,
        workspaceId: WORKSPACE_ID,
        orgId: fixture.org.id,
        sandboxId: 'download-sandbox',
        providerAccount: 'boat',
      },
      now,
    )
  const request = (
    token: string,
    headers: HeadersInit = {},
    origin = harness.env.MACHINE_ORIGIN,
  ) =>
    new Request(`${origin}${ATTACHMENT_DOWNLOAD_PATH}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...headers },
    })
  const download = async (token: string) => {
    try {
      return await handleAttachmentDownload(
        request(token),
        harness.env,
        TEST_TIME,
      )
    } catch (error) {
      return errorResponse(error)
    }
  }
  return { ...fixture, file, mint, request, download }
}

it('claims one private download once and exposes only the file bytes on the machine route', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(TEST_TIME)
  const fixture = await downloadFixture()
  const token = await fixture.mint()
  const row = await harness.env.DB.prepare(
    'SELECT digest, expires_at AS expiresAt, claimed_at AS claimedAt FROM attachment_download_tokens',
  ).first()
  expect(row).toEqual({
    digest: await hash(token),
    expiresAt: TEST_TIME + 600_000,
    claimedAt: null,
  })
  const app = createApp({ now: () => TEST_TIME })
  const responses = await Promise.all([
    app.fetch(fixture.request(token), harness.env),
    app.fetch(fixture.request(token), harness.env),
  ])
  expect(responses.map((response) => response.status).sort()).toEqual([
    200, 401,
  ])
  const response = responses.find((candidate) => candidate.status === 200)
  if (!response) throw new Error('The download did not succeed.')
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(FILE_BYTES)
  expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
  expect(response.headers.get('Content-Length')).toBe('6')
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  expect((await fixture.download(token)).status).toBe(401)
})

it('refuses browser headers and other origins without consuming the download token', async () => {
  const fixture = await downloadFixture()
  const token = await fixture.mint()
  for (const request of [
    fixture.request(token, { Cookie: 'browser-session' }),
    fixture.request(token, { Origin: harness.env.APP_ORIGIN }),
    fixture.request(token, {}, harness.env.APP_ORIGIN),
    fixture.request(token, {}, 'http://machines.conductive.test'),
  ]) {
    await expect(
      handleAttachmentDownload(request, harness.env, TEST_TIME),
    ).rejects.toMatchObject({
      status: 403,
      code: 'attachment_download_refused',
    })
  }
  expect((await fixture.download(token)).status).toBe(200)
})

it('refuses expired and unknown tokens and sweeps expired claims with the scheduled attachment cleanup', async () => {
  const fixture = await downloadFixture()
  const expired = await fixture.mint(TEST_TIME - 600_000)
  const active = await fixture.mint()
  expect((await fixture.download(expired)).status).toBe(401)
  expect((await fixture.download('unknown-token')).status).toBe(401)
  expect((await fixture.download(active)).status).toBe(200)
  await cleanupDraftAttachments(harness.env, TEST_TIME)
  expect(
    (
      await harness.env.DB.prepare(
        'SELECT digest FROM attachment_download_tokens',
      ).all()
    ).results,
  ).toEqual([{ digest: await hash(active) }])
})

it('rechecks the workspace, account, org, owner, uploader, claim, and stored size after consuming each token', async () => {
  const fixture = await downloadFixture()
  const db = harness.env.DB
  await db
    .prepare('UPDATE workspaces SET owner_user_id = ?')
    .bind(fixture.member.id)
    .run()
  const changes: readonly (readonly [string, string])[] = [
    [
      "UPDATE workspaces SET sandbox_id = 'other-sandbox'",
      "UPDATE workspaces SET sandbox_id = 'download-sandbox'",
    ],
    [
      "UPDATE workspaces SET provider_account = 'other-account'",
      "UPDATE workspaces SET provider_account = 'boat'",
    ],
    [
      'UPDATE workspaces SET archived_at = 1',
      'UPDATE workspaces SET archived_at = NULL',
    ],
    ['UPDATE orgs SET deleted_at = 1', 'UPDATE orgs SET deleted_at = NULL'],
    ['UPDATE orgs SET suspended_at = 1', 'UPDATE orgs SET suspended_at = NULL'],
    [
      `UPDATE users SET suspended_at = 1 WHERE id = '${fixture.member.id}'`,
      'UPDATE users SET suspended_at = NULL',
    ],
    [
      `UPDATE users SET suspended_at = 1 WHERE id = '${fixture.owner.id}'`,
      'UPDATE users SET suspended_at = NULL',
    ],
    [
      `DELETE FROM org_members WHERE user_id = '${fixture.owner.id}'`,
      `INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('${fixture.org.id}', '${fixture.owner.id}', 'admin', 0)`,
    ],
    [
      "UPDATE chat_attachments SET state = 'ready'",
      "UPDATE chat_attachments SET state = 'claimed'",
    ],
    [
      "UPDATE chat_attachments SET claimed_workspace_id = 'other-workspace'",
      `UPDATE chat_attachments SET claimed_workspace_id = '${WORKSPACE_ID}'`,
    ],
    [
      "UPDATE attachment_download_tokens SET org_id = 'other-org'",
      `UPDATE attachment_download_tokens SET org_id = '${fixture.org.id}'`,
    ],
    [
      'UPDATE chat_attachments SET size_bytes = 7',
      'UPDATE chat_attachments SET size_bytes = 6',
    ],
  ]
  for (const [change, restore] of changes) {
    const token = await fixture.mint()
    await db.prepare(change).run()
    const response = await fixture.download(token)
    expect(response.status, change).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'attachment_download_refused',
        message: 'The attached file is not available.',
      },
    })
    await db.prepare(restore).run()
    expect((await fixture.download(token)).status, `Consumed: ${change}`).toBe(
      401,
    )
  }
})
