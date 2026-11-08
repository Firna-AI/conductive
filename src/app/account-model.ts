import {
  ACCOUNT_PATHS,
  agentLoginPath,
  type AccountResponse,
  type AgentLoginStatus,
  type GitHubInstallationsResponse,
  type GitHubRepositoriesResponse,
  type NewWorkspaceView,
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
  readNewWorkspaceView,
} from './api/read-core'
import type { AppModel } from './app-model'
import type { AppServices } from './services'
import { load, loading, Store, type Loadable } from './store'

/**
 * The account of the person signed in: the agent logins, the preferences,
 * and the GitHub App installations. A secret goes to the Worker in a write
 * and never comes back: the account shows only the kind of each login.
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

  async signOut(): Promise<void> {
    await this.services.api.send('POST', API_PATHS.signOut, {}, ignore)
    this.app.boot.set({ state: 'signed-out' })
  }
}
