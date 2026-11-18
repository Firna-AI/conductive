import type { User } from '../shared/api'
import {
  secretAllAgentsPath,
  secretPath,
  secretRevealPath,
  secretsPath,
  type CreateSecretRequest,
  type OrgSecret,
  type ReplaceSecretRequest,
} from '../shared/secrets'
import type { ApiClient } from './api/client'
import { ignore } from './api/parse'
import {
  readRevealedValue,
  readSecretResponse,
  readSecrets,
} from './api/read-secrets'
import { Resource, same } from './resource'

type Secrets = readonly OrgSecret[]

function compare(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** The order of the list of the Worker: by name, then by ID. */
function inOrder(secrets: Secrets): Secrets {
  return [...secrets].sort(
    (a, b) => compare(a.name, b.name) || compare(a.id, b.id),
  )
}

/** The list with the newer record of one secret in its place. */
function withSecret(secret: OrgSecret) {
  return (secrets: Secrets): Secrets =>
    inOrder([...secrets.filter((item) => item.id !== secret.id), secret])
}

/**
 * The secrets of one org (secrets decisions 2 and 3), which the Secrets tab
 * and the Capabilities control show, and their changes. The list holds no
 * value. A new value goes out once and never comes back. Only a reveal of
 * an admin gives one value back, to its caller alone.
 */
export class SecretsModel {
  readonly list: Resource<Secrets>
  private readonly api: ApiClient
  private readonly orgId: string
  private readonly now: () => number

  constructor(api: ApiClient, orgId: string, now: () => number) {
    this.api = api
    this.orgId = orgId
    this.now = now
    this.list = new Resource<Secrets>(() =>
      api.get(secretsPath(orgId), readSecrets),
    )
  }

  /** Reads the list. `current` returns false when its answer is obsolete. */
  read(current?: () => boolean): Promise<void> {
    return this.list.read(current)
  }

  /** Adds a secret, which takes its place in the order of the list. */
  async create(request: CreateSecretRequest): Promise<void> {
    await this.list.write(
      same,
      () =>
        this.api.send(
          'POST',
          secretsPath(this.orgId),
          request,
          readSecretResponse,
        ),
      withSecret,
    )
  }

  /**
   * Replaces the description, the value, or both. A request without a value
   * keeps the stored value.
   */
  async replace(id: string, request: ReplaceSecretRequest): Promise<void> {
    await this.list.write(
      same,
      () =>
        this.api.send(
          'PATCH',
          secretPath(this.orgId, id),
          request,
          readSecretResponse,
        ),
      withSecret,
    )
  }

  /** Deletes a secret, which ends each of its grants. */
  async remove(id: string): Promise<void> {
    await this.list.write(
      same,
      () => this.api.send('DELETE', secretPath(this.orgId, id), {}, ignore),
      () => (secrets) => secrets.filter((item) => item.id !== id),
    )
  }

  /**
   * Sets or clears the mark for all agents. The row shows the new mark while
   * the change saves, and the saved mark again after a failure.
   */
  async setAllAgents(id: string, allAgents: boolean): Promise<void> {
    await this.list.write(
      (secrets) =>
        secrets.map((item) => (item.id === id ? { ...item, allAgents } : item)),
      () =>
        this.api.send(
          'PUT',
          secretAllAgentsPath(this.orgId, id),
          { allAgents },
          readSecretResponse,
        ),
      withSecret,
    )
  }

  /**
   * Reveals the value of one secret, which the Worker records, and gives it
   * to the caller only. The row shows the record of `viewer` at once, and the
   * list reads again for the record of the Worker.
   */
  async reveal(id: string, viewer: User): Promise<string> {
    const value = await this.api.send(
      'POST',
      secretRevealPath(this.orgId, id),
      {},
      readRevealedValue,
    )
    const lastReveal = {
      revealedByUserId: viewer.id,
      revealedBy: {
        id: viewer.id,
        githubLogin: viewer.githubLogin,
        displayName: viewer.displayName,
        avatarUrl: viewer.avatarUrl,
      },
      revealedAt: this.now(),
    }
    this.list.confirm(
      (secrets) =>
        secrets.map((item) =>
          item.id === id ? { ...item, lastReveal } : item,
        ),
      `reveal ${id}`,
    )
    void this.read()
    return value
  }
}
