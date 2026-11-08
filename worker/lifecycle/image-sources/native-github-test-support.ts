import type { IncomingMessage } from 'node:http'

import type { AppEnv, HttpFetch } from '../../env'
import { errorResponse, isRecord, privateResponse } from '../../http'
import {
  handleImageSourceCredential,
  IMAGE_SOURCE_CREDENTIAL_PATH,
} from './credential'

export const INSTALLATION_TOKEN = 'ghs_worker_only_image_source_secret'
export const SOURCE_BRANCH = "feature/reader's-default"

/** Purpose-local REST server tracks the authority and lifetime of every grant. */
export class NativeGitHubAccess {
  private readonly env: AppEnv
  readonly requests: Request[] = []
  readonly claims: Request[] = []
  readonly tokens = new Map<string, boolean>()
  readonly tokenScopes = new Map<
    string,
    { repositoryIds: readonly number[]; canRead: boolean }
  >()
  readonly events: string[] = []
  tokenFailure = false
  revokeFailures = 0
  loseRevokeReply = false
  beforeClaim?: () => Promise<void>

  constructor(env: AppEnv) {
    this.env = env
  }

  get activeTokens(): string[] {
    return [...this.tokens]
      .filter(([, active]) => active)
      .map(([token]) => token)
  }

  fetch: HttpFetch = async (request) => {
    this.requests.push(request.clone())
    const url = new URL(request.url)
    if (url.hostname !== 'api.github.com')
      throw new Error('Unexpected Worker Git request')
    if (
      url.pathname === '/app/installations/701/access_tokens' &&
      request.method === 'POST'
    ) {
      if (this.tokenFailure)
        return new Response(INSTALLATION_TOKEN, { status: 403 })
      const token = `${INSTALLATION_TOKEN}_${this.tokens.size + 1}`
      const body: unknown = await request.clone().json()
      const repositoryIds =
        isRecord(body) && Array.isArray(body.repository_ids)
          ? body.repository_ids.filter(
              (id: unknown): id is number =>
                typeof id === 'number' && Number.isSafeInteger(id),
            )
          : []
      const permissions =
        isRecord(body) && isRecord(body.permissions) ? body.permissions : {}
      this.tokenScopes.set(token, {
        repositoryIds,
        canRead:
          permissions.contents === 'read' || permissions.contents === 'write',
      })
      this.tokens.set(token, true)
      this.events.push('mint')
      return Response.json({ token }, { status: 201 })
    }
    if (url.pathname !== '/installation/token' || request.method !== 'DELETE')
      throw new Error('Unexpected installation route')
    const token = request.headers.get('Authorization')?.slice(7) ?? ''
    if (this.revokeFailures-- > 0) return new Response(token, { status: 503 })
    const active = this.tokens.get(token) === true
    this.tokens.set(token, false)
    this.events.push('revoke')
    if (this.loseRevokeReply) {
      this.loseRevokeReply = false
      throw new Error(token)
    }
    return new Response(null, { status: active ? 204 : 401 })
  }

  authorize = (authorization: string | undefined, path: string): boolean => {
    if (!authorization?.startsWith('Basic ')) return false
    const credential = Buffer.from(authorization.slice(6), 'base64').toString()
    const token = credential.slice('x-access-token:'.length)
    const scope = this.tokenScopes.get(token)
    const authorized =
      credential.startsWith('x-access-token:') &&
      this.tokens.get(token) === true &&
      scope?.canRead === true &&
      scope.repositoryIds.includes(101) &&
      path.startsWith('/repository.git/')
    if (authorized) this.events.push('git')
    return authorized
  }

  privateRequest = async (
    incoming: IncomingMessage,
  ): Promise<Response | null> => {
    if (incoming.url !== IMAGE_SOURCE_CREDENTIAL_PATH) return null
    const headers = new Headers()
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (typeof value === 'string') headers.set(name, value)
    }
    const request = new Request(
      `${this.env.MACHINE_ORIGIN}${IMAGE_SOURCE_CREDENTIAL_PATH}`,
      {
        method: incoming.method,
        headers,
      },
    )
    this.claims.push(request.clone())
    await this.beforeClaim?.()
    try {
      const response = await handleImageSourceCredential(request, this.env)
      this.events.push('claim')
      return response
    } catch (error) {
      return privateResponse(errorResponse(error))
    }
  }
}
