import type { Agent } from '../shared/generated/Agent'
import type { DefaultAgentLogin } from '../shared/generated/DefaultAgentLogin'
import { ACCOUNT_PATHS, type AccountResponse } from '../shared/account'
import type { AgentLogins, LoginRead } from './agent-logins'
import { AGENTS, readAccount } from './api/read-core'
import type { AppModel } from './app-model'
import { inOrgs, orgLoginsInUse } from './default-logins'
import { modelListWait } from './endpoint-models'
import type { OrgLoginDefaults } from './org-agent-logins'
import type { Store } from './store'

/**
 * The one owner of the reads of the logins and of the default logins of the
 * account: list opens, page returns, the timer, the reads after a change of
 * a login, an org that joins the orgs of the person, and each read of the
 * org logins of an org. Each read shows only what `AgentLogins.mark` and
 * `AgentLogins.markOrg` let it show. A read across a new app start or a
 * sign-out shows nothing.
 */
export class AccountLoginReads implements OrgLoginDefaults {
  private running: Promise<void> | null = null
  private cancelTimer: (() => void) | null = null
  /** The orgs of the person that are not deleted, while the app is ready. */
  private activeOrgs: ReadonlySet<string> | null = null
  private readonly app: AppModel
  private readonly account: Store<AccountResponse | null>
  private readonly logins: AgentLogins

  constructor(
    app: AppModel,
    account: Store<AccountResponse | null>,
    logins: AgentLogins,
  ) {
    this.app = app
    this.account = account
    this.logins = logins
    app.boot.subscribe(() => this.followOrgs())
    app.orgs.subscribe(() => this.followOrgs())
    account.subscribe(() => this.follow())
    const pageChanged = () => {
      if (app.boot.get().state === 'ready' && app.services.visible.get())
        void this.refresh()
      else this.clearTimer()
    }
    app.services.onFocus(pageChanged)
    app.services.visible.subscribe(pageChanged)
  }

  /** Reads the account. A read that runs already counts for this call. */
  refresh(): Promise<void> {
    return this.running ?? this.start()
  }

  /**
   * Reads one login after a change of a login of its agent, with the
   * caller's mark. The read also gives the default logins of that agent,
   * which the change can move to another login.
   */
  async readAgent(
    agent: Agent,
    show: (read: LoginRead, only?: Agent) => void,
  ): Promise<void> {
    const boot = this.app.boot.get()
    const account = await this.app.services.api.get(
      ACCOUNT_PATHS.account,
      readAccount,
    )
    if (this.app.boot.get() === boot) show(account, agent)
  }

  /**
   * Counts a change of an org login of `agent`, as `OrgLoginDefaults` says.
   * An account that names no default login, from an older reply, counts
   * none, so no read needs to follow a write.
   */
  orgLoginChanged(agent: Agent): boolean {
    if (!this.logins.namesDefaults()) return false
    this.logins.change(agent)
    return true
  }

  /** Marks a read of the org logins of `orgId`, as `OrgLoginDefaults` says. */
  markOrgRead(
    orgId: string,
  ): (defaults: readonly DefaultAgentLogin[] | undefined) => void {
    const boot = this.app.boot.get()
    const show = this.logins.markOrg(orgId)
    return (defaults) => {
      if (defaults && this.app.boot.get() === boot) show(defaults)
    }
  }

  /** Starts a new read of the account, also while an older one runs. */
  private start(): Promise<void> {
    this.clearTimer()
    const run: Promise<void> = this.read().finally(() => {
      if (this.running !== run) return
      this.running = null
      this.follow()
    })
    this.running = run
    return run
  }

  private async read(): Promise<void> {
    const boot = this.app.boot.get()
    const show = this.logins.mark()
    const account = await this.app.services.api
      .get(ACCOUNT_PATHS.account, readAccount)
      .catch(() => null)
    if (account && this.app.boot.get() === boot) show(account)
  }

  /**
   * Follows the orgs of the person that are not deleted. The account names
   * the default logins of an org that joins them, after an accepted
   * invitation, a restore, or a create, only in a new read. So the account
   * reads once, as a change of each agent, and a read that started before
   * shows none of its older logins. The orgs of an app start read nothing,
   * because the start read the account with them. A leave or a delete
   * reads nothing, because `inOrgs` hides their default logins at once.
   */
  private followOrgs(): void {
    if (this.app.boot.get().state !== 'ready') {
      this.activeOrgs = null
      this.follow()
      return
    }
    const before = this.activeOrgs
    const orgs = new Set(
      this.app.orgs
        .get()
        .filter((org) => !org.deletion)
        .map((org) => org.id),
    )
    this.activeOrgs = orgs
    const joined = before !== null && [...orgs].some((id) => !before.has(id))
    if (!joined || !this.logins.namesDefaults()) {
      this.follow()
      return
    }
    for (const agent of AGENTS) this.logins.change(agent)
    void this.start()
  }

  /**
   * Keeps the timer of the reads while the page shows and a model list can
   * change in the background: an own endpoint of the person, or an org
   * login that a picker of the person follows, as `orgLoginsInUse` says.
   */
  private follow(): void {
    const account = this.account.get()
    const due =
      account !== null &&
      (account.agentLogins.some(
        (login) => login.connected && login.kind === 'endpoint',
      ) ||
        orgLoginsInUse(inOrgs(account, this.app.orgs.get())))
    if (
      this.running ||
      this.app.boot.get().state !== 'ready' ||
      !this.app.services.visible.get() ||
      !due
    ) {
      this.clearTimer()
      return
    }
    this.cancelTimer ??= this.app.services.delay(modelListWait, () => {
      this.cancelTimer = null
      return this.refresh()
    })
  }

  private clearTimer(): void {
    this.cancelTimer?.()
    this.cancelTimer = null
  }
}
