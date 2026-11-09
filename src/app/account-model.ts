import {
  ACCOUNT_PATHS,
  agentLoginPath,
  type AccountResponse,
  type AgentLoginStatus,
  type GitHubInstallationsResponse,
  type GitHubRepositoriesResponse,
  type SaveAgentLoginRequest,
  type UpdateAgentLoginRequest,
  type UpdateAgentLoginResponse,
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
import type { AppServices } from './services'
import { load, loading, Store, type Loadable } from './store'

/**
 * The account of the person signed in: the agent logins, the default model,
 * and the GitHub App installations. A secret goes to the Worker in a write
 * and never comes back: the account shows only the kind of each login and
 * its share setting, which says whether other members' messages in the
 * sessions of the person run on it.
 */
export class AccountModel {
  readonly account = new Store<AccountResponse | null>(null)
  readonly installations = new Store<Loadable<GitHubInstallationsResponse>>(
    loading,
  )
  /** The repositories that Create org offers, before the org exists. */
  readonly repositories = new Store<Loadable<GitHubRepositoriesResponse>>(
    loading,
  )
  /**
   * The number of the last change of each agent login. A share reply shows
   * only while no later change of its login came first, so a removed login
   * stays removed.
   */
  private readonly loginChanges = new Map<Agent, number>()
  private readonly services: AppServices
  private readonly app: AppModel

  constructor(services: AppServices, app: AppModel) {
    this.services = services
    this.app = app
  }

  loadInstallations(): Promise<void> {
    return load(this.installations, () =>
      this.services.api.get(
        ACCOUNT_PATHS.githubInstallations,
        readInstallations,
      ),
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

  async signOut(): Promise<void> {
    await this.services.api.send('POST', API_PATHS.signOut, {}, ignore)
    this.app.boot.set({ state: 'signed-out' })
  }
}
