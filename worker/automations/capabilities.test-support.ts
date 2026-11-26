import { insertSecret } from '../secrets/writes'
import { TEST_TIME } from '../test-support/harness'
import { readAutomation } from './automation-data'
import { saveAutomation } from './automation-write-data'

export async function chooseAutomationSecrets(
  db: D1Database,
  orgId: string,
  ownerId: string,
  preapprovedSecretIds: readonly string[],
) {
  const automation = await readAutomation(db, orgId, 'automation-one')
  const saved = await saveAutomation(
    db,
    { ...automation, capabilities: { preapprovedSecretIds } },
    ownerId,
    false,
    false,
    true,
  )
  if (!saved) throw new Error('The test automation could not be saved.')
}

export async function automationSecret(
  db: D1Database,
  orgId: string,
  userId: string,
  id: string,
  name = id.toUpperCase().replaceAll('-', '_'),
) {
  const inserted = await insertSecret(db, {
    orgId,
    userId,
    id,
    name,
    description: '',
    ciphertext: 'unused-ciphertext',
    allAgents: false,
    now: TEST_TIME,
  })
  if (!inserted) throw new Error('The test secret could not be created.')
}
