import { ACCOUNT_PATHS } from '../shared/account'
import { MODELS_PATH, type AgentModel } from '../shared/agents'
import { API_PATHS, orgPath, type User } from '../shared/api'
import { GET_STARTED_PATH, type GetStartedResponse } from '../shared/onboarding'
import {
  leaveOrgPath,
  type CreateOrgRequest,
  type OrgSummary,
  type RenameOrgRequest,
} from '../shared/orgs'
import { ApiError, type ApiClient } from './api/client'
import { ignore, items, nested, record } from './api/parse'
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
import { isSuspended } from './permissions'
import type { AppServices } from './services'
import { setupSteps } from './setup-steps'
import { asApiError, Store, type Readable } from './store'

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
  /**
   * The orgs whose requests the API refused with `org_suspended`. Such a
   * refusal shows that the org is suspended, also while its summary is old.
   * It gives no time of the suspension, so the summary stays as the server
   * sent it.
   */
  readonly refusedOrgs = new Store<ReadonlySet<string>>(new Set())
  /**
   * The org that the person opened last in this tab, also a deleted one.
   * A page without an org works on it, as `keptOrg` says. The tab keeps it
   * in memory only.
   */
  readonly lastOrg = new Store<string | null>(null)
  readonly models = new Store<readonly AgentModel[]>([])
  /**
   * The steps of Get started as every screen shows them. Only the step of
   * the GitHub App comes from the reply of the API. The others follow the
   * org list and the account, as `setupSteps` says.
   */
  readonly getStarted: Readable<GetStartedResponse | null>
  readonly account: AccountModel
  /** The invitations that wait for the user, which Home shows first. */
  readonly invitations: InvitationsModel
  readonly services: AppServices
  private readonly orgModels = new Map<string, OrgModel>()
  /** The last reply of the API on the steps. No screen reads it as it is. */
  private readonly setupReply = new Store<GetStartedResponse | null>(null)
  private started = false
  /** The person of the last ready boot, whose creates the org models keep. */
  private userId: string | null = null

  constructor(services: AppServices) {
    this.services = services
    this.account = new AccountModel(services, this)
    this.getStarted = setupSteps({
      server: this.setupReply,
      orgs: this.orgs,
      account: this.account.account,
    })
    this.invitations = new InvitationsModel(this)
    // The model lives as long as its store, so it never unsubscribes.
    this.boot.subscribe(() => this.followPerson())
  }

  /**
   * A sign-out, or a sign-in of another person, ends the create requests
   * of every org that still run, so that their answers change nothing.
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
      this.setupReply.set(getStarted)
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
      model = new OrgModel(this.services, orgId, {
        suspended: this.suspended(orgId),
        note: () => this.noteSuspended(orgId),
      })
      this.orgModels.set(orgId, model)
    }
    return model
  }

  /**
   * Whether an org is suspended, from its summary or from a refusal of the
   * API, as a value to follow.
   */
  private suspended(orgId: string): Readable<boolean> {
    return {
      get: () => {
        const org = this.orgs.get().find((item) => item.id === orgId)
        return org !== undefined && isSuspended(org, this.refusedOrgs.get())
      },
      subscribe: (listener) => {
        const stops = [
          this.orgs.subscribe(listener),
          this.refusedOrgs.subscribe(listener),
        ]
        return () => {
          for (const stop of stops) stop()
        }
      },
    }
  }

  /** The person opens a page of an org. */
  openOrg(orgId: string): void {
    this.lastOrg.set(orgId)
  }

  async refreshGetStarted(): Promise<void> {
    this.setupReply.set(
      await this.services.api.get(GET_STARTED_PATH, readGetStarted),
    )
  }

  /**
   * Takes a refusal with `org_suspended` for one of the org's requests, also
   * while the org list still shows the org in use. So a page with an old
   * org list shows the suspended org at once, and keeps it after an owner
   * change of a workspace.
   */
  noteSuspended(orgId: string): void {
    const refused = this.refusedOrgs.get()
    if (!refused.has(orgId)) this.refusedOrgs.set(new Set([...refused, orgId]))
  }

  /**
   * The client for the writes of one org: the client of its `OrgModel`. A
   * refusal with `org_suspended` marks the org, also while the org list is
   * old. A create and the account actions use the client of the app.
   */
  private orgApi(orgId: string): ApiClient {
    return this.org(orgId).services.api
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
      await this.orgApi(orgId).send(
        'PATCH',
        orgPath(orgId),
        request,
        readOrgResponse,
      ),
    )
  }

  /**
   * Leaves an org, and takes it out of the list of the user. A suspended
   * org takes a leave too, as its one change. The API refuses the leave of
   * the last active admin with `last_admin`, and the caller shows it.
   */
  async leaveOrg(orgId: string): Promise<void> {
    await this.orgApi(orgId).send('POST', leaveOrgPath(orgId), {}, ignore)
    this.orgs.change((orgs) => orgs.filter((org) => org.id !== orgId))
  }
}
