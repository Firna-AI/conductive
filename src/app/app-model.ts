import { ACCOUNT_PATHS } from '../shared/account'
import { MODELS_PATH, type AgentModel } from '../shared/agents'
import { API_PATHS, orgPath, type User } from '../shared/api'
import { GET_STARTED_PATH, type GetStartedResponse } from '../shared/onboarding'
import type {
  CreateOrgRequest,
  OrgSummary,
  RenameOrgRequest,
} from '../shared/orgs'
import { ApiError } from './api/client'
import { items, nested, record } from './api/parse'
import {
  readAccount,
  readGetStarted,
  readModel,
  readOrg,
  readUser,
} from './api/read-core'
import { AccountModel } from './account-model'
import { InvitationsModel } from './invitations-model'
import { OrgModel } from './org-model'
import type { AppServices } from './services'
import { asApiError, Store } from './store'

export type Boot =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'failed'; error: ApiError }
  | { state: 'ready'; user: User }

const readOrgResponse = (body: unknown) => nested(record(body), 'org', readOrg)

/**
 * The data that every screen shares: the person signed in, their orgs, the
 * models, and the steps of Get started. It also keeps one `OrgModel` for
 * each org that the user opens.
 */
export class AppModel {
  readonly boot = new Store<Boot>({ state: 'loading' })
  readonly orgs = new Store<readonly OrgSummary[]>([])
  readonly models = new Store<readonly AgentModel[]>([])
  readonly getStarted = new Store<GetStartedResponse | null>(null)
  readonly account: AccountModel
  /** The invitations that wait for the user, which Home shows first. */
  readonly invitations: InvitationsModel
  readonly services: AppServices
  private readonly orgModels = new Map<string, OrgModel>()
  private started = false
  /** The person of the last ready boot, whose creates the org models keep. */
  private userId: string | null = null

  constructor(services: AppServices) {
    this.services = services
    this.account = new AccountModel(services, this)
    this.invitations = new InvitationsModel(this)
    // The model lives as long as its store, so it never unsubscribes.
    this.boot.subscribe(() => this.followPerson())
  }

  /**
   * A sign-out, or a sign-in of another person, forgets the admitted
   * creates of every org, with the messages that they keep.
   */
  private followPerson(): void {
    const boot = this.boot.get()
    const person = boot.state === 'ready' ? boot.user.id : null
    if (
      boot.state !== 'signed-out' &&
      (person === null || person === this.userId)
    ) {
      return
    }
    for (const org of this.orgModels.values()) org.creations.clear()
    this.userId = person
  }

  /** Starts the first load once, also when React runs an effect twice. */
  ensureStarted(): void {
    if (this.started) return
    this.started = true
    void this.start()
  }

  async start(): Promise<void> {
    const { api } = this.services
    this.boot.set({ state: 'loading' })
    try {
      const user = await api.get(API_PATHS.session, (body) =>
        nested(record(body), 'user', readUser),
      )
      const [account, orgs, models, getStarted] = await Promise.all([
        api.get(ACCOUNT_PATHS.account, readAccount),
        api.get(API_PATHS.orgs, (body) => items(record(body), 'orgs', readOrg)),
        api.get(MODELS_PATH, (body) =>
          items(record(body), 'models', readModel),
        ),
        api.get(GET_STARTED_PATH, readGetStarted),
      ])
      this.account.account.set(account)
      this.orgs.set(orgs)
      this.models.set(models)
      this.getStarted.set(getStarted)
      this.boot.set({ state: 'ready', user })
    } catch (error) {
      const failure = asApiError(error)
      this.boot.set(
        failure.status === 401
          ? { state: 'signed-out' }
          : { state: 'failed', error: failure },
      )
    }
  }

  org(orgId: string): OrgModel {
    let model = this.orgModels.get(orgId)
    if (!model) {
      model = new OrgModel(this.services, orgId)
      this.orgModels.set(orgId, model)
    }
    return model
  }

  async refreshGetStarted(): Promise<void> {
    this.getStarted.set(
      await this.services.api.get(GET_STARTED_PATH, readGetStarted),
    )
  }

  /**
   * Puts a newer record of an org in the list of the user, such as the
   * answer of Delete org or Restore. The rail and the screens of the org
   * follow it.
   */
  putOrg(org: OrgSummary): void {
    this.orgs.change((orgs) =>
      orgs.some((item) => item.id === org.id)
        ? orgs.map((item) => (item.id === org.id ? org : item))
        : [...orgs, org],
    )
  }

  /**
   * Creates an org with its name, its custom initials, and the GitHub IDs
   * of the repositories that it chose from the account's list.
   */
  async createOrg(request: CreateOrgRequest): Promise<OrgSummary> {
    const org = await this.services.api.send(
      'POST',
      API_PATHS.orgs,
      request,
      readOrgResponse,
    )
    this.putOrg(org)
    return org
  }

  /** Saves the name and the initials of an org. */
  async renameOrg(orgId: string, request: RenameOrgRequest): Promise<void> {
    this.putOrg(
      await this.services.api.send(
        'PATCH',
        orgPath(orgId),
        request,
        readOrgResponse,
      ),
    )
  }
}
