import type {
  RunWithSecretsRequest,
  RunWithSecretsResponse,
  SecretRunGrant,
} from '../../src/shared/secret-requests'
import type { ChatTransaction } from '../chat/store'
import { decrypt } from '../security/crypto'
import { secretValueContext } from './data'
import { secretCiphertexts, secretGrants } from './grant-data'
import { temporaryValueContext } from './request-records'
import { secretRunAccess } from './request-access'
import type { SecretRuntime } from './runtime'
import type { WorkspaceOperation } from '../chat/workspace-operation'

export async function resolveSecretNames(
  runtime: SecretRuntime,
  view: ChatTransaction,
  orgId: string,
  workspaceId: string,
  sessionId: string | null,
  names: readonly string[],
) {
  const secrets = await secretGrants(
    runtime.env.DB,
    orgId,
    workspaceId,
    sessionId,
  )
  const values = (await view.secrets.temporary(runtime.now())).filter(
    (value) => value.sessionId === null || value.sessionId === sessionId,
  )
  return names.map((name) => ({
    name,
    secret: secrets.find((secret) => secret.name === name),
    temporary: values.find((value) => value.name === name),
  }))
}

export async function grantedRun(
  runtime: SecretRuntime,
  operation: WorkspaceOperation,
  request: Request,
  input: RunWithSecretsRequest,
  id: string,
): Promise<RunWithSecretsResponse | null> {
  const { workspace, turn } = await secretRunAccess(
    runtime.env,
    runtime.chat,
    request,
    runtime.matches,
  )
  const resolved = await runtime.chat.store.read(workspace.id, (view) =>
    resolveSecretNames(
      runtime,
      view,
      workspace.orgId,
      workspace.id,
      turn.sessionId,
      input.names,
    ),
  )
  if (resolved.some((item) => !item.temporary && !item.secret?.grant))
    return null
  const stored = resolved.flatMap((item) =>
    !item.temporary && item.secret ? [item.secret] : [],
  )
  const ciphertexts = await secretCiphertexts(
    runtime.env.DB,
    workspace.orgId,
    stored.map((secret) => secret.id),
  )
  if (ciphertexts.length !== stored.length) return null
  const entries: [string, string][] = []
  const grants: SecretRunGrant[] = []
  for (const item of resolved) {
    const row = ciphertexts.find((row) => row.name === item.name)
    if (item.temporary) {
      entries.push([
        item.name,
        await decrypt(
          item.temporary.ciphertext,
          temporaryValueContext(workspace.id, item.temporary.id),
          runtime.env.BOAT_KEY_ENCRYPTION_KEY,
        ),
      ])
      grants.push({
        name: item.name,
        grant:
          item.temporary.expiresAt === null ? 'workspace-value' : '15-minutes',
      })
    } else if (row && item.secret?.grant) {
      entries.push([
        item.name,
        await decrypt(
          row.ciphertext,
          secretValueContext(workspace.orgId, row.id),
          runtime.env.BOAT_KEY_ENCRYPTION_KEY,
        ),
      ])
      grants.push({ name: item.name, grant: item.secret.grant })
    }
  }
  await secretRunAccess(runtime.env, runtime.chat, request, runtime.matches)
  const current = await secretGrants(
    runtime.env.DB,
    workspace.orgId,
    workspace.id,
    turn.sessionId,
  )
  if (
    stored.some(
      (secret) => !current.some((item) => item.id === secret.id && item.grant),
    ) ||
    resolved.some(
      (item) =>
        item.temporary?.expiresAt !== null &&
        item.temporary?.expiresAt !== undefined &&
        item.temporary.expiresAt <= runtime.now(),
    )
  )
    return null
  await operation.change(async (view) => {
    await view.secrets.use(stored.map((secret) => secret.id))
    const filter = await runtime.filter(
      view,
      workspace,
      entries.map(([, value]) => value),
    )
    await view.emit({
      type: 'secrets.run',
      sessionId: turn.sessionId,
      turnId: turn.id,
      id,
      names: input.names,
      command: filter(input.command),
      reason: filter(input.reason ?? ''),
      grants,
    })
  })
  return { status: 'allowed', values: Object.fromEntries(entries), grants }
}
