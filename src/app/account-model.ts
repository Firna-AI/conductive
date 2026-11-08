import {
  ACCOUNT_PATHS,
  agentLoginPath,
  type AccountResponse,
  type AgentLoginStatus,
  type GitHubInstallationsResponse,
  type GitHubRepositoriesResponse,
  type SaveAgentLoginRequest,
} from '../shared/account'
import type { Agent, AgentChoice } from '../shared/agents'
import { API_PATHS } from '../shared/api'
import { ignore, nested, record } from './api/parse'
import {
  readChoice,
  readGitHubRepositories,
  readInstallations,
  readLogin,
} from './api/read-core'
import type { AppModel } from './app-model'
import { Refresher } from './refresh'
import { Resource } from './resource'
import type { AppServices } from './services'
import { load, loading, Store, type Loadable, type Readable } from './store'

/**
 * The account of the person signed in: the agent logins, the default model,
 * and the GitHub App installations. A secret goes to the Worker in a write
 * and never comes back: the account shows only the kind of each login.
 */
export class AccountModel {
  readonly account = new Store<AccountResponse | null>(null)
  readonly installations: Readable<Loadable<GitHubInstallationsResponse>>
  /** The repositories that Create org offers, before the org exists. */
  readonly repositories = new Store<Loadable<GitHubRepositoriesResponse>>(
    loading,
  )
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

  login(agent: Agent): AgentLoginStatus {
    return (
      this.account.get()?.agentLogins.find((item) => item.agent === agent) ?? {
        agent,
        connected: false,
      }
    )
  }

  async saveLogin(request: SaveAgentLoginRequest): Promise<void> {
    this.putLogin(
      await this.services.api.send(
        'PUT',
        agentLoginPath(request.agent),
        request,
        readLogin,
      ),
    )
  }

  async removeLogin(agent: Agent): Promise<void> {
    await this.services.api.send('DELETE', agentLoginPath(agent), {}, ignore)
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

  async signOut(): Promise<void> {
    await this.services.api.send('POST', API_PATHS.signOut, {}, ignore)
    this.app.boot.set({ state: 'signed-out' })
  }
}
