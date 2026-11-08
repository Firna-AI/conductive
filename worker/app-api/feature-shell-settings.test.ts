import { afterEach, beforeAll, expect, it } from 'vitest'

import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import { workspaceEnvironment } from '../lifecycle/settings-data'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('saves shared scripts and encrypted env values through the real Worker and keeps member writes read-only', async () => {
  fixture = await createOuterRuntime(bundle)
  const path = orgSettingsPaths.settings(OUTER_ORG)
  const read = await fixture.request(path)
  expect(read.status).toBe(200)
  expect(await read.json()).toMatchObject({
    settings: {
      installScript: '',
      startupScript: '',
      envVars: [],
      needsBuild: false,
    },
  })
  const saved = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      installScript: 'npm ci\nnpm run build',
      startupScript: 'npm run dev',
      envVars: [{ operation: 'set', name: 'SERVICE_TOKEN', value: 'secret-a' }],
    }),
  })
  expect(saved.status).toBe(200)
  const savedText = await saved.text()
  expect(JSON.parse(savedText)).toMatchObject({
    settings: {
      installScript: 'npm ci\nnpm run build',
      startupScript: 'npm run dev',
      envVars: [{ name: 'SERVICE_TOKEN' }],
      needsBuild: true,
    },
  })
  expect(savedText).not.toContain('secret-a')
  const stored = await fixture.env.DB.prepare(
    'SELECT env_vars_ciphertext AS ciphertext, revision FROM settings WHERE org_id = ?',
  )
    .bind(OUTER_ORG)
    .first<{ ciphertext: string; revision: number }>()
  expect(stored?.revision).toBe(2)
  expect(stored?.ciphertext).not.toContain('secret-a')
  expect(await workspaceEnvironment(fixture.env, OUTER_ORG)).toEqual({
    SERVICE_TOKEN: 'secret-a',
  })
  const member = await fixture.request(path, {
    method: 'PATCH',
    headers: { Cookie: fixture.cookies.memberCookie },
    body: JSON.stringify({ startupScript: 'changed by member' }),
  })
  expect(member.status).toBe(403)
  expect(await member.json()).toMatchObject({
    error: { code: 'admin_required' },
  })
  const memberRead = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(memberRead.status).toBe(200)
  expect(await memberRead.json()).toMatchObject({
    settings: {
      startupScript: 'npm run dev',
      envVars: [{ name: 'SERVICE_TOKEN' }],
    },
  })
  const removed = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      startupScript: '',
      envVars: [{ operation: 'remove', name: 'SERVICE_TOKEN' }],
    }),
  })
  expect(removed.status).toBe(200)
  expect(await removed.json()).toMatchObject({
    settings: { startupScript: '', envVars: [], needsBuild: true },
  })
  expect(await workspaceEnvironment(fixture.env, OUTER_ORG)).toEqual({})
  expect(
    await fixture.env.DB.prepare(
      'SELECT revision FROM settings WHERE org_id = ?',
    )
      .bind(OUTER_ORG)
      .first('revision'),
  ).toBe(2)
  await fixture.env.DB.prepare('UPDATE users SET suspended_at = 1 WHERE id = ?')
    .bind('owner')
    .run()
  const suspended = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({ startupScript: 'suspended' }),
  })
  expect(suspended.status).toBe(401)
  expect(await suspended.json()).toMatchObject({
    error: { code: 'sign_in_required' },
  })
})
