import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  attachmentUploadPartPath,
  attachmentUploadUrl,
} from '../../src/shared/messages'
import { createApp } from '../application'
import {
  streamedBody,
  streamedRequest,
} from '../http/request-body.test-support'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { gate } from './gate'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})
it('checks sign-in, Origin, and org access before pulling a raw upload body', async () => {
  const fixture = await createChatFixture(harness)
  const path = attachmentUploadUrl(
    fixture.org.id,
    { type: 'workspace', workspaceId: WORKSPACE_ID },
    { name: 'file.bin', mediaType: 'application/octet-stream' },
  )
  const app = createApp({ now: () => TEST_TIME })
  for (const [uploadPath, method] of [
    [path, 'POST'],
    [
      attachmentUploadPartPath(
        fixture.org.id,
        { type: 'workspace', workspaceId: WORKSPACE_ID },
        'upload',
        1,
      ),
      'PUT',
    ],
  ]) {
    for (const [cookie, origin, status] of [
      ['', TEST_ORIGIN, 401],
      [fixture.ownerCookie, 'https://elsewhere.test', 403],
      [fixture.ownerCookie, TEST_ORIGIN, 404],
    ] as const) {
      const body = streamedBody([new Uint8Array(100000001)])
      const url =
        status === 404
          ? uploadPath.replace(fixture.org.id, 'another-org')
          : uploadPath
      const response = await app.fetch(
        streamedRequest(
          `${TEST_ORIGIN}${url}`,
          body.body,
          {
            Cookie: cookie,
            Origin: origin,
            'Content-Type': 'application/octet-stream',
            'Content-Length': '100000001',
          },
          method,
        ),
        harness.env,
      )
      expect(response.status).toBe(status)
      expect(body.observed).toEqual({ pulled: 0, bytes: 0, cancelled: 0 })
    }
  }
  const partPath = attachmentUploadPartPath(
    fixture.org.id,
    { type: 'workspace', workspaceId: WORKSPACE_ID },
    'upload',
    1,
  )
  const checkBlocked = async (
    status: number,
    code: string,
    host = TEST_ORIGIN,
  ) => {
    const stream = streamedBody([new Uint8Array(6)])
    await expect(
      gate(
        streamedRequest(
          `${host}${partPath}`,
          stream.body,
          {
            Cookie: fixture.memberCookie,
            Origin: TEST_ORIGIN,
            'Content-Type': 'application/octet-stream',
            'Content-Length': '6',
          },
          'PUT',
        ),
        harness.env,
        TEST_TIME,
      ),
    ).rejects.toMatchObject({ status, code })
    expect(stream.observed).toEqual({ pulled: 0, bytes: 0, cancelled: 0 })
  }
  await checkBlocked(403, 'origin_forbidden', 'https://wrong-host.test')
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, fixture.org.id)
    .run()
  await checkBlocked(403, 'org_suspended')
  await harness.env.DB.prepare(
    'UPDATE orgs SET suspended_at = NULL WHERE id = ?',
  )
    .bind(fixture.org.id)
    .run()
  await harness.env.DB.prepare('DELETE FROM user_app_access WHERE user_id = ?')
    .bind(fixture.member.id)
    .run()
  await checkBlocked(403, 'access_required')
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, fixture.member.id)
    .run()
  await checkBlocked(401, 'sign_in_required')
})
it('requires explicit octet-stream and valid known length while leaving authorized bytes unread in the gate', async () => {
  const ownerCookie = await harness.login()
  const org = await harness.createOrg(ownerCookie)
  const path = attachmentUploadUrl(
    org.id,
    { type: 'new-workspace', messageId: 'raw-first' },
    { name: 'image.png', mediaType: 'image/png' },
  )
  const cases: {
    type: string | null
    length: string | null
    status: number
    code: string
  }[] = [
    {
      type: null,
      length: '6',
      status: 415,
      code: 'file_content_type_required',
    },
    {
      type: 'text/plain',
      length: '6',
      status: 415,
      code: 'file_content_type_required',
    },
    {
      type: 'application/octet-stream; charset=utf-8',
      length: '6',
      status: 415,
      code: 'file_content_type_required',
    },
    {
      type: 'application/octet-stream',
      length: null,
      status: 411,
      code: 'content_length_required',
    },
    {
      type: 'application/octet-stream',
      length: '-1',
      status: 400,
      code: 'invalid_content_length',
    },
    {
      type: 'application/octet-stream',
      length: 'unknown',
      status: 400,
      code: 'invalid_content_length',
    },
    {
      type: 'application/octet-stream',
      length: '100000001',
      status: 413,
      code: 'attachment_too_large',
    },
  ]
  for (const [uploadPath, method] of [
    [path, 'POST'],
    [
      attachmentUploadPartPath(
        org.id,
        { type: 'new-workspace', messageId: 'raw-first' },
        'upload',
        1,
      ),
      'PUT',
    ],
  ]) {
    for (const item of cases) {
      const stream = streamedBody([new Uint8Array(6)])
      const headers = new Headers({ Cookie: ownerCookie, Origin: TEST_ORIGIN })
      if (item.type !== null) headers.set('Content-Type', item.type)
      if (item.length !== null) headers.set('Content-Length', item.length)
      await expect(
        gate(
          streamedRequest(
            `${TEST_ORIGIN}${uploadPath}`,
            stream.body,
            headers,
            method,
          ),
          harness.env,
          TEST_TIME,
        ),
      ).rejects.toMatchObject({ status: item.status, code: item.code })
      expect(stream.observed.pulled).toBe(0)
    }
    const stream = streamedBody([new Uint8Array(6)])
    const context = await gate(
      streamedRequest(
        `${TEST_ORIGIN}${uploadPath}`,
        stream.body,
        {
          Cookie: ownerCookie,
          Origin: TEST_ORIGIN,
          'Content-Type': 'application/octet-stream',
          'Content-Length': '6',
        },
        method,
      ),
      harness.env,
      TEST_TIME,
    )
    expect(context.body).toBeNull()
    expect(context.rawUploadBytes).toBe(6)
    expect(stream.observed.pulled).toBe(0)
  }
})
