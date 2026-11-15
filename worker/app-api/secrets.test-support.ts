import { expect } from 'vitest'

import { secretsPath } from '../../src/shared/secrets'
import type { OuterRuntime } from '../chat/integration/outer-runtime.test-support'
import { record, string } from '../chat/inputs'
import { secretValueContext } from '../secrets/data'
import { decrypt } from '../security/crypto'

export async function secretReply(response: { json(): Promise<unknown> }) {
  const secret = record(record(await response.json()).secret)
  return { ...secret, id: string(secret.id) }
}

export async function addSecret(
  fixture: OuterRuntime,
  orgId: string,
  name = 'TOKEN',
  cookie = fixture.cookies.memberCookie,
) {
  const response = await fixture.request(secretsPath(orgId), {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify({ name, description: 'Access', value: 'private' }),
  })
  expect(response.status).toBe(201)
  return secretReply(response)
}

export async function addSessionApproval(
  fixture: OuterRuntime,
  orgId: string,
  workspaceId: string,
  sessionId: string,
  secretId: string,
) {
  await fixture.env.DB.prepare(
    `INSERT INTO session_secret_approvals (org_id, workspace_id, session_id, secret_id, approved_by_user_id, approved_at)
     VALUES (?, ?, ?, ?, 'member', 123)`,
  )
    .bind(orgId, workspaceId, sessionId, secretId)
    .run()
}

export async function storedSecretValue(
  fixture: OuterRuntime,
  orgId: string,
  secretId: string,
) {
  const ciphertext = await fixture.env.DB.prepare(
    'SELECT value_ciphertext AS ciphertext FROM org_secrets WHERE id = ?',
  )
    .bind(secretId)
    .first<string>('ciphertext')
  if (ciphertext === null) throw new Error('Missing encrypted secret')
  return {
    ciphertext,
    value: await decrypt(
      ciphertext,
      secretValueContext(orgId, secretId),
      fixture.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  }
}
