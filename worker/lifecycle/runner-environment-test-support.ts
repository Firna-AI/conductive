import { encrypt } from '../security/crypto'
import type { backendFixture } from './backend-test-support'
import { orgEnvironmentContext } from './settings-data'

type Fixture = Awaited<ReturnType<typeof backendFixture>>

export async function saveEnvironment(
  fixture: Fixture,
  secret: string,
  classified = true,
  extra: Record<string, string> = {},
) {
  const { runtime, org } = fixture
  const ciphertext = await encrypt(
    JSON.stringify({
      ...(classified
        ? {
            ORG_SECRET: { value: secret, secret: true },
            PUBLIC_MODE: { value: 'production', secret: false },
            PUBLIC_FLAG: { value: '1', secret: false },
            SHORT_SECRET: { value: 'a', secret: true },
          }
        : { ORG_SECRET: secret }),
      ...extra,
    }),
    orgEnvironmentContext(org.id),
    runtime.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await runtime.env.DB.prepare(
    'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
  )
    .bind(ciphertext, org.id)
    .run()
  return ciphertext
}

export async function saveOwnerDisplayName(
  fixture: Fixture,
  displayName: string | null,
) {
  await fixture.runtime.env.DB.prepare(
    'UPDATE users SET display_name = ? WHERE id = ?',
  )
    .bind(displayName, fixture.user.id)
    .run()
}
