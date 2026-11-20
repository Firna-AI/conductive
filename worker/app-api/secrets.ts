import {
  secretAllAgentsPath,
  secretPath,
  secretRevealPath,
  secretsPath,
  type CreateSecretRequest,
  type ReplaceSecretRequest,
  type RevealSecretResponse,
  type SecretResponse,
  type SecretsResponse,
  type SetSecretAllAgentsRequest,
} from '../../src/shared/secrets'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import { requireOrgMember } from '../members/permissions'
import { requireSecretWriter } from '../secrets/access'
import { listSecrets, readSecret, secretValueContext } from '../secrets/data'
import { recordSecretReveal } from '../secrets/reveals'
import {
  deleteSecret,
  insertSecret,
  replaceSecret,
  setSecretAllAgents,
} from '../secrets/writes'
import { decrypt, encrypt } from '../security/crypto'
import type { RequestContext } from '../security/gate'
import { shellChildId } from './feature-shell-access'

export async function secretsRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const userId = context.user.id
  const path = new URL(request.url).pathname
  const root = secretsPath(orgId)
  const suffix = ['/all-agents', '/reveal'].find((end) => path.endsWith(end))
  const id = shellChildId(suffix ? path.slice(0, -suffix.length) : path, root)
  if (path !== root && !id) return null
  if (path === root && request.method === 'GET') {
    await requireOrgMember(env.DB, orgId, userId)
    return Response.json({
      secrets: await listSecrets(env.DB, orgId),
    } satisfies SecretsResponse)
  }
  const body = context.body ?? {}
  if (path === root && request.method === 'POST') {
    const allAgents = optionalBoolean(body.allAgents) ?? false
    await requireSecretWriter(env.DB, orgId, userId, undefined, allAgents)
    const secretId = dependencies.randomToken()
    const input: CreateSecretRequest = {
      name: requiredString(body.name),
      description: optionalText(body.description) ?? '',
      value: text(body.value),
      allAgents,
    }
    const saved = await insertSecret(env.DB, {
      orgId,
      id: secretId,
      userId,
      name: input.name,
      description: input.description,
      ciphertext: await encrypt(
        input.value,
        secretValueContext(orgId, secretId),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
      allAgents,
      now: dependencies.now(),
    })
    if (!saved) {
      await requireSecretWriter(env.DB, orgId, userId, undefined, allAgents)
      throw new HttpError(
        409,
        'secret_name_exists',
        'A secret with this name already exists in this org.',
      )
    }
    return Response.json(
      {
        secret: await readSecret(env.DB, orgId, secretId),
      } satisfies SecretResponse,
      { status: 201 },
    )
  }
  if (!id) return null
  if (path === secretRevealPath(orgId, id) && request.method === 'POST') {
    await requireSecretWriter(env.DB, orgId, userId, id, true)
    const ciphertext = await recordSecretReveal(
      env.DB,
      orgId,
      id,
      userId,
      dependencies.now(),
    )
    if (ciphertext === null) {
      await requireSecretWriter(env.DB, orgId, userId, id, true)
      throw new HttpError(
        404,
        'secret_not_found',
        'The secret is not available.',
      )
    }
    return Response.json({
      value: await decrypt(
        ciphertext,
        secretValueContext(orgId, id),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    } satisfies RevealSecretResponse)
  }
  if (
    path === secretPath(orgId, id) &&
    ['PATCH', 'DELETE'].includes(request.method)
  ) {
    await requireSecretWriter(env.DB, orgId, userId, id)
    if (request.method === 'DELETE') {
      if (!(await deleteSecret(env.DB, orgId, id, userId)))
        await requireSecretWriter(env.DB, orgId, userId, id)
      return new Response(null, { status: 204 })
    }
    const input: ReplaceSecretRequest = {
      value: optionalText(body.value),
      description: optionalText(body.description),
    }
    const value = input.value
    const saved = await replaceSecret(env.DB, {
      orgId,
      id,
      userId,
      description: input.description,
      ciphertext:
        value === undefined || value === ''
          ? undefined
          : await encrypt(
              value,
              secretValueContext(orgId, id),
              env.BOAT_KEY_ENCRYPTION_KEY,
            ),
      now: dependencies.now(),
    })
    if (!saved) await requireSecretWriter(env.DB, orgId, userId, id)
  } else if (
    path === secretAllAgentsPath(orgId, id) &&
    request.method === 'PUT'
  ) {
    await requireSecretWriter(env.DB, orgId, userId, id, true)
    const allAgents = optionalBoolean(body.allAgents)
    if (allAgents === undefined) throw invalidInput()
    const input: SetSecretAllAgentsRequest = { allAgents }
    if (
      !(await setSecretAllAgents(
        env.DB,
        orgId,
        id,
        userId,
        input.allAgents,
        dependencies.now(),
      ))
    )
      await requireSecretWriter(env.DB, orgId, userId, id, true)
  } else return null
  return Response.json({
    secret: await readSecret(env.DB, orgId, id),
  } satisfies SecretResponse)
}

function invalidInput() {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw invalidInput()
  return value
}
function optionalText(value: unknown): string | undefined {
  return value === undefined ? undefined : text(value)
}
function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || typeof value === 'boolean') return value
  throw invalidInput()
}
