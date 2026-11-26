import type { MessageSender } from '../../shared/generated/MessageSender'
import { SECRET_NAME_ERROR, validSecretName } from '../../shared/secret-names'
import {
  lateAnswerParts,
  lateAnswerText,
} from '../../shared/secret-late-answer'
import {
  secretAnswerPath,
  secretRequestsPath,
  workspaceSecretValuePath,
  type SecretRequest,
  type SecretRequestsResponse,
  type SecretValueLifetime,
} from '../../shared/secret-requests'
import { choice, record, text } from '../api/parse'
import { requireOrg, requireWorkspace, type DevBackend } from './backend'
import {
  ID,
  json,
  noContent,
  RouteError,
  type Params,
  type Route,
} from './router'
import { grantsOf, settleCovered } from './secret-allow'
import {
  followOpenRequests,
  orgSecretsOf,
  senderOf,
  type OrgSecrets,
} from './secret-store'

const LIFETIMES = ['15-minutes', 'workspace', 'save'] as const

/** An answer of a member, as the Worker reads it. */
function readAnswer(body: unknown): {
  kind: 'deny' | 'allow' | 'values'
  lifetime: SecretValueLifetime | null
  values: Readonly<Record<string, unknown>>
} {
  const fields = record(body)
  const kind = choice(fields, 'kind', ['deny', 'allow', 'values'])
  if (kind !== 'values') return { kind, lifetime: null, values: {} }
  return {
    kind,
    lifetime: choice(fields, 'lifetime', LIFETIMES),
    values: record(fields.values, 'values'),
  }
}

/** The text that the Worker gives the agent for a late Allow. */
function noticeText(request: SecretRequest, member: MessageSender): string {
  const name = member.displayName ?? member.githubLogin
  return lateAnswerText(lateAnswerParts(request, name, 'this org'))
}

/** Keeps a value for the workspace, or a new secret of the org for Save. */
function keepValues(
  store: OrgSecrets,
  request: SecretRequest,
  member: MessageSender,
  now: number,
  newId: () => string,
): void {
  const missing = request.secrets.filter((secret) => secret.secretId === null)
  if (request.lifetime === 'workspace') {
    const kept = store.values.get(request.workspaceId) ?? []
    const added = missing.map((secret) => ({
      id: newId(),
      name: secret.name,
      suppliedBy: member,
      createdAt: now,
    }))
    store.values.set(request.workspaceId, [...kept, ...added])
  }
  if (request.lifetime !== 'save') return
  for (const secret of missing) {
    store.secrets.push({
      value: 'saved-in-development',
      secret: {
        id: newId(),
        name: secret.name,
        description: request.reason,
        createdByUserId: member.id,
        createdBy: member,
        allAgents: false,
        createdAt: now,
        updatedAt: now,
        lastReveal: null,
      },
    })
  }
}

/**
 * The secret requests of each workspace, as the Worker serves them to
 * members: the list with the values of the workspace, the answer of a
 * member, and the removal of a value. An Allow in time sends the run of the
 * request. A late Allow sends the line that tells the agent, in a new turn.
 * An Allow also allows each other open request that its grant covers. The
 * fake keeps no value of a request and runs no command.
 */
export function secretRequestRoutes(backend: DevBackend): Route[] {
  const scope = (params: Params) => {
    const org = requireOrg(backend.state, params.org)
    requireWorkspace(org, params.workspace)
    return orgSecretsOf(backend.state, org.org.id)
  }
  return [
    {
      method: 'GET',
      path: secretRequestsPath(ID.org, ID.workspace),
      answer: ({ params }) => {
        const store = scope(params)
        return json({
          requests: [...store.requests.values()].filter(
            (request) => request.workspaceId === params.workspace,
          ),
          workspaceValues: store.values.get(params.workspace) ?? [],
        } satisfies SecretRequestsResponse)
      },
    },
    {
      method: 'POST',
      path: secretAnswerPath(ID.org, ID.workspace, ID.request),
      answer: ({ params, body }) => {
        const store = scope(params)
        const found = store.requests.get(params.request)
        if (!found || found.workspaceId !== params.workspace) {
          throw new RouteError(
            404,
            'secret_request_not_found',
            'The request is not available.',
          )
        }
        if (found.state === 'not-answered') {
          throw new RouteError(
            409,
            'secret_request_ended',
            'This request is no longer open.',
          )
        }
        if (found.state !== 'waiting' && found.state !== 'late') {
          return json({ request: found })
        }
        const answer = readAnswer(body)
        const missing = found.secrets.filter(
          (secret) => secret.secretId === null,
        )
        if (answer.kind !== 'deny' && missing.length > 0) {
          const typed = missing.every(
            (secret) => text(answer.values, secret.name) !== '',
          )
          if (answer.kind !== 'values' || !typed) {
            throw new RouteError(
              400,
              'invalid_input',
              'Complete the required fields.',
            )
          }
        }
        if (
          answer.kind === 'values' &&
          answer.lifetime === 'save' &&
          missing.some((secret) => !validSecretName(secret.name))
        )
          throw new RouteError(400, 'invalid_secret_name', SECRET_NAME_ERROR)
        const member = senderOf(backend.state.account.user)
        const now = backend.now()
        const late = found.state === 'late'
        const answered: SecretRequest = {
          ...found,
          state: answer.kind === 'deny' ? 'denied' : 'allowed',
          answeredBy: member,
          updatedAt: now,
          lifetime: answer.lifetime,
        }
        if (answer.kind !== 'deny')
          keepValues(store, answered, member, now, backend.newId)
        const turnId = `turn-answer-${answered.id}`
        const request: SecretRequest =
          late && answer.kind !== 'deny'
            ? { ...answered, notice: { state: 'sent', turnId } }
            : answered
        store.requests.set(request.id, request)
        const { sessionId } = request
        backend.emit(request.workspaceId, {
          type: 'secrets.request.updated',
          sessionId,
          request,
        })
        if (answer.kind !== 'deny') settleCovered(backend, store, request)
        followOpenRequests(
          backend,
          requireOrg(backend.state, params.org),
          request.workspaceId,
        )
        if (answer.kind === 'deny') return json({ request })
        if (late) {
          const words = noticeText(request, member)
          backend.emit(request.workspaceId, {
            type: 'secrets.notice',
            sessionId,
            turnId,
            requestId: request.id,
            text: words,
          })
        } else {
          backend.emit(request.workspaceId, {
            type: 'secrets.run',
            sessionId,
            turnId: request.turnId,
            id: request.id,
            names: request.secrets.map((secret) => secret.name),
            command: request.command,
            reason: request.reason,
            grants: grantsOf(request),
          })
        }
        return json({ request })
      },
    },
    {
      method: 'DELETE',
      path: workspaceSecretValuePath(ID.org, ID.workspace, ID.value),
      answer: ({ params }) => {
        const store = scope(params)
        const kept = store.values.get(params.workspace) ?? []
        store.values.set(
          params.workspace,
          kept.filter((value) => value.id !== params.value),
        )
        return noContent()
      },
    },
  ]
}
