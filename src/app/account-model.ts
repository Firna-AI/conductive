import {
  ACCOUNT_PATHS,
  agentLoginPath,
  type AccountResponse,
  type AgentLoginStatus,
  type GitHubInstallationsResponse,
  type GitHubRepositoriesResponse,
  type NewWorkspaceView,
  type SaveAgentLoginRequest,
  type UpdateAgentLoginRequest,
  type UpdateAgentLoginResponse,
} from '../shared/account'
import type { Agent, AgentChoice } from '../shared/agents'
import { API_PATHS } from '../shared/api'
import type { SaveShortcutsRequest } from '../shared/shortcuts'
import { WAITLIST_PATHS, type WaitlistStateResponse } from '../shared/waitlist'
import { ignore, nested, record } from './api/parse'
import {
  readChoice,
  readGitHubRepositories,
  readInstallations,
  readLogin,
  readNewWorkspaceView,
  readSavedShortcuts,
} from './api/read-core'
import { readWaitlistState } from './api/read-waitlist'
import type { AppModel } from './app-model'
import { Refresher } from './refresh'
import { Resource } from './resource'
import type { AppServices } from './services'
import { load, loading, Store, type Loadable, type Readable } from './store'

/**
 * The account of the person signed in: the agent logins, the preferences,
 * the shortcut changes, and the GitHub App installations. A secret goes to
 * the Worker in a write and never comes back: the account shows only the
 * kind of each login and its share setting, which says whether other
 * members' messages in the sessions of the person run on it.
 */
export class AccountModel {
  readonly account = new Store<AccountResponse | null>(null)
  readonly installations: Readable<Loadable<GitHubInstallationsResponse>>
  /** The repositories that Create org offers, before the org exists. */
  readonly repositories = new Store<Loadable<GitHubRepositoriesResponse>>(
    loading,
  )
  /**
   * The waitlist state of the user, for the invite code of the account:
   * the code with its uses, and whether sign-ups are paused.
   */
  readonly waitlist = new Store<Loadable<WaitlistStateResponse>>(loading)
  /**
   * The number of the last change of each agent login. A share reply shows
   * only while no later change of its login came first, so a removed login
   * stays removed.
   */
  private readonly loginChanges = new Map<Agent, number>()
  private readonly services: AppServices
  private readonly app: AppModel
  private readonly installationReads: Refresher<GitHubInstallationsResponse>
  /** The read of the steps that a return to the page started, while it runs. */
  private stepsOnReturn: Promise<void> | null = null

  constructor(services: AppServices, app: AppModel) {
    this.services = services
    this.app = app
    const installations = new Resource(() =>
      services.api.get(ACCOUNT_PATHS.githubInstallations, readInstallations),
    )
    this.installations = installations.store
    this.installationReads = new Refresher(installations, () => null, services)
  }

  /**
   * Reads the installs while a screen shows them: at once, and each time
   * that the user comes back to the page, such as from GitHub in another
   * window. A return also reads the steps of Get started again, because an
   * install completes its first step. A failed read keeps what shows.
   */
  watchInstallations(): () => void {
    const stopReads = this.installationReads.watch()
    const stopSteps = this.services.onFocus(() => this.readStepsOnReturn())
    return () => {
      stopReads()
      stopSteps()
    }
  }

  /**
   * Reads the steps of Get started after a return to the page. One return
   * to a browser tab can call the focus listener twice, once for the focus
   * and once for the page that shows again, so a return shares a read that
   * runs already. A read after a step does not share it, so that it reads
   * the change of that step.
   */
  private readStepsOnReturn(): void {
    this.stepsOnReturn ??= this.app
      .refreshGetStarted()
      .catch(() => undefined)
      .finally(() => {
        this.stepsOnReturn = null
      })
  }

  /** Reads the installs now, such as for Try again after a failed read. */
  loadInstallations(): Promise<void> {
    return this.installationReads.refresh()
  }

  /** Reads the invite code each time that the account opens, as its uses change. */
  loadWaitlist(): Promise<void> {
    return load(this.waitlist, () =>
      this.services.api.get(WAITLIST_PATHS.state, readWaitlistState),
    )
  }

  loadRepositories(): Promise<void> {
    return load(this.repositories, () =>
      this.services.api.get(
        ACCOUNT_PATHS.githubRepositories,
        readGitHubRepositories,
      ),
    )
  }

  private putLogin(login: AgentLoginStatus): void {
    const account = this.account.get()
    if (!account) return
    const others = account.agentLogins.filter(
      (item) => item.agent !== login.agent,
    )
    this.account.set({
      ...account,
      agentLogins: [...others, login].sort((a, b) =>
        a.agent.localeCompare(b.agent),
      ),
    })
  }

  /**
   * The API refused an operator request, so the person is no longer an
   * operator. The rail and the org switcher drop Operator, and the operator
   * section shows the not-found page, until the next load reads the account.
   */
  refuseOperator(): void {
    const account = this.account.get()
    if (account?.operator) this.account.set({ ...account, operator: false })
  }

  private changeLogin(agent: Agent): number {
    const change = (this.loginChanges.get(agent) ?? 0) + 1
    this.loginChanges.set(agent, change)
    return change
  }

  login(agent: Agent): AgentLoginStatus {
    return (
      this.account.get()?.agentLogins.find((item) => item.agent === agent) ?? {
        agent,
        connected: false,
      }
    )
  }

  async saveLogin(request: SaveAgentLoginRequest): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      agentLoginPath(request.agent),
      request,
      readLogin,
    )
    this.changeLogin(request.agent)
    this.putLogin(saved)
  }

  /**
   * Saves whether the messages of other members in the sessions of the user
   * run on a login of the user. The reply holds the saved status of the
   * login, which can say that the login is gone. A save, a remove, or
   * another share change that comes first makes the reply old, so it does
   * not show.
   */
  async setNoReuse(agent: Agent, noReuse: boolean): Promise<void> {
    const change = this.changeLogin(agent)
    const request: UpdateAgentLoginRequest = { noReuse }
    const saved: UpdateAgentLoginResponse = await this.services.api.send(
      'PATCH',
      agentLoginPath(agent),
      request,
      readLogin,
    )
    if (this.loginChanges.get(agent) === change) this.putLogin(saved)
  }

  async removeLogin(agent: Agent): Promise<void> {
    await this.services.api.send('DELETE', agentLoginPath(agent), {}, ignore)
    this.changeLogin(agent)
    this.putLogin({ agent, connected: false })
  }

  async setDefaultChoice(choice: AgentChoice): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      ACCOUNT_PATHS.defaultModel,
      { choice },
      (body) => nested(record(body), 'choice', readChoice),
    )
    const account = this.account.get()
    if (account) this.account.set({ ...account, defaultChoice: saved })
  }

  async setNewWorkspaceView(view: NewWorkspaceView): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      ACCOUNT_PATHS.newWorkspaceView,
      { view },
      readNewWorkspaceView,
    )
    const account = this.account.get()
    if (account) this.account.set({ ...account, newWorkspaceView: saved.view })
  }

  /**
   * Saves the shortcut changes of one keyboard in one batch: all of them or
   * none. The reply holds every change of that keyboard, which the keymap
   * of the keys and of each hint read from the account. A failed save
   * changes nothing, so the account keeps the saved keys.
   */
  async saveShortcuts(request: SaveShortcutsRequest): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      ACCOUNT_PATHS.shortcuts,
      request,
      readSavedShortcuts,
    )
    const account = this.account.get()
    if (!account) return
    this.account.set({
      ...account,
      shortcuts: { ...account.shortcuts, [saved.keyboard]: saved.changes },
    })
  }

  async signOut(): Promise<void> {
    await this.services.api.send('POST', API_PATHS.signOut, {}, ignore)
    this.app.boot.set({ state: 'signed-out' })
  }
}
