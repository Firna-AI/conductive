import {
  secretAllAgentsPath,
  secretPath,
  secretRevealPath,
  secretsPath,
  type OrgSecret,
} from '../../shared/secrets'
import { SECRET_NAME_ERROR, validSecretName } from '../../shared/secret-names'
import { flag, record, text } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import { capabilityRoutes } from './capability-routes'
import {
  ID,
  json,
  noContent,
  optional,
  requiredText,
  RouteError,
  type Params,
  type Route,
} from './router'
import { orgSecretsOf, senderOf, type DevSecret } from './secret-store'
import type { OrgState } from './state'

/** What a route of a secret works on: the org, its secrets, and the person. */
function scopeOf(backend: DevBackend, params: Params) {
  const org = requireOrg(backend.state, params.org)
  const store = orgSecretsOf(backend.state, org.org.id)
  return { org, store, user: backend.state.account.user }
}

function requireAdmin(org: OrgState): void {
  if (org.org.role === 'admin') return
  throw new RouteError(
    403,
    'admin_required',
    'Ask an org admin to make this change.',
  )
}

function requireSecret(secrets: readonly DevSecret[], id: string): DevSecret {
  const found = secrets.find((item) => item.secret.id === id)
  if (found) return found
  throw new RouteError(404, 'secret_not_found', 'The secret is not available.')
}

/** Only the member who added a secret and the admins change it. */
function requireWriter(org: OrgState, userId: string, item: DevSecret): void {
  if (org.org.role === 'admin' || item.secret.createdByUserId === userId) return
  throw new RouteError(
    403,
    'secret_creator_required',
    'Only the member who added this secret or an org admin can change it.',
  )
}

/** A new record of a secret, in place of the old one. */
function put(secrets: DevSecret[], id: string, secret: OrgSecret): Response {
  const item = requireSecret(secrets, id)
  item.secret = secret
  return json({ secret })
}

/**
 * The secrets of an org, as the Worker answers them: the list holds no
 * value, a member changes only the own secrets, and only an admin sets the
 * mark for all agents or reveals a value, which the fake records. A
 * suspended org refuses each write, also a reveal, through `guardScope`.
 */
export function secretRoutes(backend: DevBackend): Route[] {
  const one = secretPath(ID.org, ID.secret)
  return [
    {
      method: 'GET',
      path: secretsPath(ID.org),
      answer: ({ params }) => {
        const { store } = scopeOf(backend, params)
        return json({ secrets: store.secrets.map((item) => item.secret) })
      },
    },
    {
      method: 'POST',
      path: secretsPath(ID.org),
      answer: ({ params, body }) => {
        const { org, store, user } = scopeOf(backend, params)
        const fields = record(body)
        const name = requiredText(fields, 'name')
        const allAgents = optional(fields, 'allAgents', flag) ?? false
        if (allAgents) requireAdmin(org)
        if (!validSecretName(name))
          throw new RouteError(400, 'invalid_secret_name', SECRET_NAME_ERROR)
        if (store.secrets.some((item) => item.secret.name === name)) {
          throw new RouteError(
            409,
            'secret_name_exists',
            'A secret with this name already exists in this org.',
          )
        }
        const at = backend.now()
        const secret: OrgSecret = {
          id: backend.newId(),
          name,
          description: optional(fields, 'description', text) ?? '',
          createdByUserId: user.id,
          createdBy: senderOf(user),
          allAgents,
          createdAt: at,
          updatedAt: at,
          lastReveal: null,
        }
        store.secrets.push({ secret, value: text(fields, 'value') })
        store.secrets.sort((a, b) => (a.secret.name < b.secret.name ? -1 : 1))
        return json({ secret }, 201)
      },
    },
    {
      method: 'PATCH',
      path: one,
      answer: ({ params, body }) => {
        const { org, store, user } = scopeOf(backend, params)
        const item = requireSecret(store.secrets, params.secret)
        requireWriter(org, user.id, item)
        const fields = record(body)
        const value = optional(fields, 'value', text)
        const replaced = value !== undefined && value !== ''
        if (replaced) item.value = value
        return put(store.secrets, params.secret, {
          ...item.secret,
          description:
            optional(fields, 'description', text) ?? item.secret.description,
          updatedAt: backend.now(),
          // A reveal read the old value, which is gone.
          lastReveal: replaced ? null : item.secret.lastReveal,
        })
      },
    },
    {
      method: 'DELETE',
      path: one,
      answer: ({ params }) => {
        const { org, store, user } = scopeOf(backend, params)
        const item = requireSecret(store.secrets, params.secret)
        requireWriter(org, user.id, item)
        store.secrets = store.secrets.filter((entry) => entry !== item)
        // A deleted secret ends each of its grants.
        for (const [id, grants] of store.capabilities) {
          store.capabilities.set(id, {
            ...grants,
            preapprovedSecretIds: grants.preapprovedSecretIds.filter(
              (secretId) => secretId !== params.secret,
            ),
            sessionApprovals: grants.sessionApprovals.filter(
              (approval) => approval.secretId !== params.secret,
            ),
          })
        }
        // It also leaves the chosen secrets of each automation, as the
        // foreign key of the Worker's table does.
        org.automations = org.automations.map((automation) => ({
          ...automation,
          capabilities: {
            preapprovedSecretIds:
              automation.capabilities.preapprovedSecretIds.filter(
                (secretId) => secretId !== params.secret,
              ),
          },
        }))
        return noContent()
      },
    },
    {
      method: 'PUT',
      path: secretAllAgentsPath(ID.org, ID.secret),
      answer: ({ params, body }) => {
        const { org, store } = scopeOf(backend, params)
        requireAdmin(org)
        const item = requireSecret(store.secrets, params.secret)
        return put(store.secrets, params.secret, {
          ...item.secret,
          allAgents: flag(record(body), 'allAgents'),
          updatedAt: backend.now(),
        })
      },
    },
    {
      method: 'POST',
      path: secretRevealPath(ID.org, ID.secret),
      answer: ({ params }) => {
        const { org, store, user } = scopeOf(backend, params)
        requireAdmin(org)
        const item = requireSecret(store.secrets, params.secret)
        item.secret = {
          ...item.secret,
          lastReveal: {
            revealedByUserId: user.id,
            revealedBy: senderOf(user),
            revealedAt: backend.now(),
          },
        }
        return json({ value: item.value })
      },
    },
    ...capabilityRoutes(backend),
  ]
}
