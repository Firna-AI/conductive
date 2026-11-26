import { secretValueContext } from '../secrets/data'
import { encrypt } from '../security/crypto'
import { insertSecret } from '../secrets/writes'
import { temporaryValueContext } from '../secrets/request-records'
import { TEST_TIME } from '../test-support/harness'
import { WORKSPACE_ID, type ChatFixture } from './harness.test-support'

export async function capabilitySecret(
  f: ChatFixture,
  name: string,
  allAgents = false,
  orgId = f.org.id,
) {
  const id = `${orgId}-${name}`
  const value = `private-value-${name}`
  const description = `private-description-${name}`
  const ciphertext = await encrypt(
    value,
    secretValueContext(orgId, id),
    f.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  const inserted = await insertSecret(f.env.DB, {
    id,
    orgId,
    name,
    description,
    ciphertext,
    allAgents,
    userId: f.owner.id,
    now: TEST_TIME,
  })
  if (!inserted) throw new Error('The capability secret was not inserted.')
  return { id, name, value, description, ciphertext }
}

export async function capabilityValue(
  f: ChatFixture,
  id: string,
  name: string,
  sessionId: string | null = null,
  expiresAt: number | null = null,
) {
  const value = `private-value-${id}`
  const ciphertext = await encrypt(
    value,
    temporaryValueContext(WORKSPACE_ID, id),
    f.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await f.changeWorkspace(WORKSPACE_ID, (view) =>
    view.secrets.saveValue({
      id,
      name,
      sessionId,
      expiresAt,
      ciphertext,
      createdAt: TEST_TIME,
      suppliedBy: {
        id: f.owner.id,
        githubLogin: 'octocat',
        displayName: 'Octocat',
        avatarUrl: null,
      },
    }),
  )
  return { id, value, ciphertext }
}
