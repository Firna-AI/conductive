import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  orgEnvironmentContext,
  workspaceEnvironmentSettings,
} from '../lifecycle/settings-data'
import { encrypt } from '../security/crypto'
import { createHarness, type TestHarness } from '../test-support/harness'
import * as settingsData from './feature-settings-data'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it('preserves the authoritative secret mark after a value replacement loses its compare-and-swap', async () => {
  const cookie = await harness.login()
  const org = await harness.createOrg(cookie)
  const path = orgSettingsPaths.settings(org.id)
  const save = (body: unknown) =>
    harness.request(path, cookie, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  expect(
    (
      await save({
        envVars: [
          { operation: 'set', name: 'TOKEN', value: 'before', secret: true },
        ],
      })
    ).status,
  ).toBe(200)
  const update = settingsData.updateShellSettings
  const writes = vi.spyOn(settingsData, 'updateShellSettings')
  writes.mockImplementationOnce(async (db, input) => {
    const concurrent = await encrypt(
      JSON.stringify({ TOKEN: { value: 'before', secret: false } }),
      orgEnvironmentContext(org.id),
      harness.env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await db
      .prepare('UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?')
      .bind(concurrent, org.id)
      .run()
    return update(db, input)
  })
  const response = await save({
    envVars: [{ operation: 'set', name: 'TOKEN', value: 'after' }],
  })
  expect(response.status).toBe(200)
  expect(writes).toHaveBeenCalledTimes(2)
  expect(await workspaceEnvironmentSettings(harness.env, org.id)).toEqual({
    TOKEN: { value: 'after', secret: false },
  })
  expect(await response.json()).toMatchObject({
    settings: { envVars: [{ name: 'TOKEN', secret: false }] },
  })
})
