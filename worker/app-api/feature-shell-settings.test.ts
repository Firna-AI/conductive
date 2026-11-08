import { afterEach, beforeAll, expect, it } from 'vitest'

import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import {
  orgEnvironmentContext,
  workspaceEnvironmentSettings,
} from '../lifecycle/settings-data'
import { encrypt } from '../security/crypto'

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
  const legacy = await encrypt(
    JSON.stringify({ LEGACY_TOKEN: 'legacy-private-value' }),
    orgEnvironmentContext(OUTER_ORG),
    fixture.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await fixture.env.DB.prepare(
    'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
  )
    .bind(legacy, OUTER_ORG)
    .run()
  const path = orgSettingsPaths.settings(OUTER_ORG)
  const read = await fixture.request(path)
  expect(read.status).toBe(200)
  expect(await read.json()).toMatchObject({
    settings: {
      installScript: '',
      startupScript: '',
      envVars: [{ name: 'LEGACY_TOKEN', secret: true }],
      needsBuild: false,
    },
  })
  const saved = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      installScript: 'npm ci\nnpm run build',
      startupScript: 'npm run dev',
      envVars: [
        {
          operation: 'set',
          name: 'SERVICE_TOKEN',
          value: 'secret-a',
        },
        {
          operation: 'set',
          name: 'PUBLIC_MODE',
          value: 'production',
          secret: false,
        },
        {
          operation: 'set',
          name: '__proto__',
          value: 'prototype-value',
          secret: false,
        },
      ],
    }),
  })
  expect(saved.status).toBe(200)
  const savedText = await saved.text()
  expect(JSON.parse(savedText)).toMatchObject({
    settings: {
      installScript: 'npm ci\nnpm run build',
      startupScript: 'npm run dev',
      envVars: [
        { name: 'LEGACY_TOKEN', secret: true },
        { name: 'PUBLIC_MODE', secret: false },
        { name: 'SERVICE_TOKEN', secret: true },
        { name: '__proto__', secret: false },
      ],
      needsBuild: true,
    },
  })
  expect(savedText).not.toContain('secret-a')
  expect(savedText).not.toContain('production')
  expect(savedText).not.toContain('legacy-private-value')
  expect(savedText).not.toContain('prototype-value')
  const stored = await fixture.env.DB.prepare(
    'SELECT env_vars_ciphertext AS ciphertext, revision FROM settings WHERE org_id = ?',
  )
    .bind(OUTER_ORG)
    .first<{ ciphertext: string; revision: number }>()
  expect(stored?.revision).toBe(2)
  expect(stored?.ciphertext).not.toContain('secret-a')
  expect(await workspaceEnvironmentSettings(fixture.env, OUTER_ORG)).toEqual({
    LEGACY_TOKEN: { value: 'legacy-private-value', secret: true },
    PUBLIC_MODE: { value: 'production', secret: false },
    SERVICE_TOKEN: { value: 'secret-a', secret: true },
    ['__proto__']: { value: 'prototype-value', secret: false },
  })
  const member = await fixture.request(path, {
    method: 'PATCH',
    headers: { Cookie: fixture.cookies.memberCookie },
    body: JSON.stringify({
      startupScript: 'changed by member',
      envVars: [
        { operation: 'classify', name: 'SERVICE_TOKEN', secret: false },
      ],
    }),
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
      envVars: [
        { name: 'LEGACY_TOKEN', secret: true },
        { name: 'PUBLIC_MODE', secret: false },
        { name: 'SERVICE_TOKEN', secret: true },
        { name: '__proto__', secret: false },
      ],
    },
  })
  const classified = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      envVars: [
        { operation: 'classify', name: 'SERVICE_TOKEN', secret: false },
        { operation: 'classify', name: '__proto__', secret: true },
        { operation: 'classify', name: 'constructor', secret: false },
      ],
    }),
  })
  expect(classified.status).toBe(200)
  expect(await classified.json()).toMatchObject({
    settings: {
      envVars: [
        { name: 'LEGACY_TOKEN', secret: true },
        { name: 'PUBLIC_MODE', secret: false },
        { name: 'SERVICE_TOKEN', secret: false },
        { name: '__proto__', secret: true },
      ],
    },
  })
  expect(await workspaceEnvironmentSettings(fixture.env, OUTER_ORG)).toEqual({
    LEGACY_TOKEN: { value: 'legacy-private-value', secret: true },
    PUBLIC_MODE: { value: 'production', secret: false },
    SERVICE_TOKEN: { value: 'secret-a', secret: false },
    ['__proto__']: { value: 'prototype-value', secret: true },
  })
  const removed = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      startupScript: '',
      envVars: [
        { operation: 'remove', name: 'LEGACY_TOKEN' },
        { operation: 'remove', name: 'PUBLIC_MODE' },
        { operation: 'remove', name: 'SERVICE_TOKEN' },
        { operation: 'remove', name: '__proto__' },
      ],
    }),
  })
  expect(removed.status).toBe(200)
  expect(await removed.json()).toMatchObject({
    settings: { startupScript: '', envVars: [], needsBuild: true },
  })
  expect(await workspaceEnvironmentSettings(fixture.env, OUTER_ORG)).toEqual({})
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
