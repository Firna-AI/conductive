import type { AnswerSecretRequest } from '../../src/shared/secret-requests'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { WorkspaceOperation } from '../chat/workspace-operation'
import { HttpError } from '../http'
import { encrypt, randomToken } from '../security/crypto'
import { requireSecretWriter } from './access'
import { secretValueContext } from './data'
import { secretGrants, sessionApproval } from './grant-data'
import { requireSecretName } from './names'
import type { StoredSecretRequest, TemporarySecret } from './request-records'
import { openSecretRequest, temporaryValueContext } from './request-records'
import { secretInputError } from './request-input'
import type { SecretRuntime } from './runtime'
import { insertSecret } from './writes'

export async function answerSecretRequest(
  runtime: SecretRuntime,
  operation: WorkspaceOperation,
  record: StoredSecretRequest,
  answer: AnswerSecretRequest,
  member: MessageSender,
) {
  if (!openSecretRequest(record.request)) {
    if (record.request.state === 'not-answered')
      throw new HttpError(
        409,
        'secret_request_ended',
        'This request is no longer open.',
      )
    return record.request
  }
  const missing = record.request.secrets.filter(
    (secret) => secret.secretId === null,
  )
  if (answer.kind !== 'deny' && missing.length) {
    if (
      answer.kind !== 'values' ||
      missing.some(
        (secret) =>
          !Object.hasOwn(answer.values, secret.name) ||
          !answer.values[secret.name],
      )
    )
      throw secretInputError()
  }
  await requireSecretWriter(runtime.env.DB, record.orgId, member.id)
  if (answer.kind === 'values' && answer.lifetime === 'save')
    for (const secret of missing) requireSecretName(secret.name)
  const lateAnswer = record.request.state === 'late'
  const now = runtime.now()
  const approvals = record.request.secrets.flatMap((secret) =>
    secret.secretId === null ? [] : [secret.secretId],
  )
  const temporary: TemporarySecret[] = []
  if (answer.kind === 'values') {
    for (const secret of missing) {
      const id = randomToken()
      const value = answer.values[secret.name]
      if (answer.lifetime === 'save') {
        const inserted = await insertSecret(runtime.env.DB, {
          id,
          orgId: record.orgId,
          userId: member.id,
          name: secret.name,
          description: record.request.reason,
          allAgents: false,
          now,
          ciphertext: await encrypt(
            value,
            secretValueContext(record.orgId, id),
            runtime.env.BOAT_KEY_ENCRYPTION_KEY,
          ),
        })
        const currentId = inserted
          ? id
          : (
              await secretGrants(
                runtime.env.DB,
                record.orgId,
                record.request.workspaceId,
                record.request.sessionId,
              )
            ).find((item) => item.name === secret.name)?.id
        if (currentId) approvals.push(currentId)
      } else {
        temporary.push({
          id,
          name: secret.name,
          suppliedBy: member,
          createdAt: now,
          sessionId:
            answer.lifetime === '15-minutes' ? record.request.sessionId : null,
          expiresAt:
            answer.lifetime === '15-minutes' ? now + 15 * 60_000 : null,
          ciphertext: await encrypt(
            value,
            temporaryValueContext(record.request.workspaceId, id),
            runtime.env.BOAT_KEY_ENCRYPTION_KEY,
          ),
        })
      }
    }
  }
  if (answer.kind !== 'deny' && approvals.length)
    await runtime.env.DB.batch(
      approvals.map((secretId) =>
        sessionApproval(runtime.env.DB, {
          orgId: record.orgId,
          workspaceId: record.request.workspaceId,
          sessionId: record.request.sessionId,
          secretId,
          userId: member.id,
          now,
        }),
      ),
    )
  await requireSecretWriter(runtime.env.DB, record.orgId, member.id)
  record = {
    ...record,
    lateAnswer,
    request: {
      ...record.request,
      state: answer.kind === 'deny' ? 'denied' : 'allowed',
      answeredBy: member,
      updatedAt: now,
      lifetime: answer.kind === 'values' ? answer.lifetime : null,
    },
  }
  await operation.change(async (view) => {
    for (const value of temporary) await view.secrets.saveValue(value)
    const filter = await runtime.filter(
      view,
      { id: record.request.workspaceId, orgId: record.orgId },
      answer.kind === 'values' ? Object.values(answer.values) : [],
    )
    record.request = {
      ...record.request,
      command: filter(record.request.command),
      reason: filter(record.request.reason),
    }
    await runtime.save(view, record)
  })
  if (lateAnswer && answer.kind !== 'deny')
    record.request.notice = await runtime.chat.secretNotice(record)
  await runtime.publish(operation, record)
  return record.request
}
