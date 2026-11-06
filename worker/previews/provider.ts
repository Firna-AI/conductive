import { readBoatKey } from '../data/boat-keys'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import { BoatClient } from '../sandbox/boat'
import { ProviderError, providerError } from '../sandbox/errors'
import type { BoatAccount } from '../sandbox/provider'
import { decrypt } from '../security/crypto'
import { verifyTarget } from './access'
import type { WorkspaceTarget } from './types'

export interface PrivatePort {
  origin: string
  token: string
}

export type PortMode = 'localhost' | 'network'

/** The only extra provider routes are host and desktop. Commands use BoatClient. */
export class WorkspaceTools {
  private readonly env: AppEnv
  private readonly target: WorkspaceTarget
  private readonly fetch: HttpFetch
  private readonly key: string
  private readonly account: BoatAccount
  private readonly userId?: string

  private constructor(
    env: AppEnv,
    target: WorkspaceTarget,
    fetch: HttpFetch,
    key: string,
    account: BoatAccount,
    userId?: string,
  ) {
    this.env = env
    this.target = target
    this.fetch = fetch
    this.key = key
    this.account = account
    this.userId = userId
  }

  static async forWorkspace(
    env: AppEnv,
    target: WorkspaceTarget,
    fetch: HttpFetch,
    userId?: string,
  ) {
    await verifyTarget(env, target, userId, false)
    const stored = await readBoatKey(env.DB, target.orgId)
    if (!stored)
      throw new HttpError(
        409,
        'boat_key_required',
        'Ask an org admin to add its cloud computer key.',
      )
    const account: BoatAccount = {
      id: stored.accountId,
      type: stored.accountType,
    }
    const key = await decrypt(
      stored.ciphertext,
      JSON.stringify(['boat-key', target.orgId, account.type, account.id]),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
    return new WorkspaceTools(env, target, fetch, key, account, userId)
  }

  async privatePort(port: number, mode: PortMode): Promise<PrivatePort> {
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new ProviderError('invalid_request', 400)
    const value = await this.request('host', {
      port,
      public: false,
      localhost: mode === 'localhost',
    })
    if (
      value.type !== 'port.hosted' ||
      value.port !== port ||
      value.access !== 'private' ||
      value.isProtected !== true ||
      typeof value.url !== 'string'
    ) {
      throw new ProviderError('invalid_response', 502)
    }
    let url: URL
    try {
      url = new URL(value.url)
    } catch {
      throw new ProviderError('invalid_response', 502)
    }
    const token = url.searchParams.get('_token')
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !new RegExp(`^[a-z0-9-]+-${port}\\.on\\.boat\\.dev$`).test(
        url.hostname,
      ) ||
      url.pathname !== '/' ||
      url.hash ||
      url.searchParams.getAll('_token').length !== 1 ||
      !token ||
      !/^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]+$/.test(token)
    ) {
      throw new ProviderError('invalid_response', 502)
    }
    return { origin: url.origin, token }
  }

  async desktop(): Promise<string> {
    const value = await this.request('desktop', {})
    if (value.type === 'desktop.provisioning' && value.provisioning === true) {
      throw new HttpError(
        409,
        'desktop_starting',
        'The desktop is starting. Try again.',
      )
    }
    if (value.type !== 'desktop.url' || typeof value.desktopUrl !== 'string')
      throw new ProviderError('invalid_response', 502)
    let url: URL
    try {
      url = new URL(value.desktopUrl)
    } catch {
      throw new ProviderError('invalid_response', 502)
    }
    const fragment = new URLSearchParams(url.hash.slice(1))
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.searchParams.has('_token') ||
      url.searchParams.has('token') ||
      !fragment.get('token')
    )
      throw new ProviderError('invalid_response', 502)
    return url.href
  }

  async command(command: string) {
    await verifyTarget(this.env, this.target, this.userId, false)
    return new BoatClient(this.key, this.fetch, this.account).runCommand(
      this.sandboxId(),
      command,
    )
  }

  private sandboxId(): string {
    const id = this.target.sandboxId
    if (!id || id === '.' || id === '..' || /[/\\?#\s]/.test(id))
      throw new ProviderError('invalid_request', 400)
    return id
  }

  private async request(
    operation: 'host' | 'desktop',
    body: Record<string, unknown>,
  ) {
    await verifyTarget(this.env, this.target, this.userId)
    let response: Response
    try {
      response = await this.fetch(
        new Request(
          `https://boat.dev/api/v1/sandboxes/${encodeURIComponent(this.sandboxId())}/${operation}`,
          {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(30_000),
            headers: {
              Authorization: `Bearer ${this.key}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Boat-Org':
                this.account.type === 'personal' ? 'personal' : this.account.id,
            },
            body: JSON.stringify(body),
          },
        ),
      )
    } catch {
      throw new ProviderError('unavailable', 503)
    }
    let value: unknown
    try {
      value = await response.json()
    } catch {
      if (!response.ok) throw providerError(response, null)
      throw new ProviderError('invalid_response', 502)
    }
    if (!response.ok) throw providerError(response, value)
    if (!isRecord(value) || value.ok !== true)
      throw new ProviderError('invalid_response', 502)
    return value
  }
}
