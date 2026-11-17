import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { decrypt } from '../security/crypto'
import { secretValueContext } from './data'
import { secretCiphertexts } from './grant-data'
import type { SecretRequestRecords } from './request-records'
import { temporaryValueContext } from './request-records'

export async function agentOutputSecrets(
  env: AppEnv,
  records: SecretRequestRecords,
  workspace: { id: string; orgId: string },
  now: number,
): Promise<string[]> {
  const values: string[] = []
  for (const row of await secretCiphertexts(
    env.DB,
    workspace.orgId,
    await records.used(),
  ))
    values.push(
      await decrypt(
        row.ciphertext,
        secretValueContext(workspace.orgId, row.id),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
  for (const value of await records.temporary(now))
    values.push(
      await decrypt(
        value.ciphertext,
        temporaryValueContext(workspace.id, value.id),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
  return values
}

export function secretTextFilter(values: readonly string[]) {
  const sanitizer = new OutputSanitizer()
  for (const value of values) sanitizer.add(value)
  return (text: string) => sanitizer.text(text)
}
