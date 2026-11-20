import type { Agent } from '../shared/generated/Agent'
import { ACCOUNT_PATHS, type AccountResponse } from '../shared/account'
import type { AccountLoginRequests } from './account-login-requests'
import type { AgentLogins, LoginRead } from './agent-logins'
import { AGENTS, readAccount } from './api/read-core'
import type { AppModel } from './app-model'
import type { Boot } from './boot'
import { inOrgs, orgLoginsInUse } from './default-logins'
import { modelListWait } from './endpoint-models'
import {
  contradictsLogin,
  loginObservationKey,
  type LoginObservation,
} from './login-observation'
import type { Store } from './store'

/**
 * The one owner of the reads of the logins and of the default logins of the
 * account: list opens, page returns, the timer, the reads after a change of
 * a login, an org that joins the orgs of the person, newer login facts, and
 * shown missing-login notices. Each read is a read
 * of the whole account, because only its reply holds the logins and the
 * default logins of every org. It shows only what `AgentLogins.mark` lets
 * it show. A read across a new app start or a sign-out shows nothing.
 */
export class AccountLoginReads {
  private running: Promise<void> | null = null
  private cancelTimer: (() => void) | null = null
  /** The orgs of the person that are not deleted, while the app is ready. */
  private activeOrgs: ReadonlySet<string> | null = null
  private readonly observations = new Map<
    string,
    { available: boolean; readVersion: number }
  >()
  private readonly missingNotices = new Set<object>()
  private readonly app: AppModel
  private readonly account: Store<AccountResponse | null>
  private readonly logins: AgentLogins
  private readonly requests: AccountLoginRequests

  constructor(
    app: AppModel,
    account: Store<AccountResponse | null>,
    logins: AgentLogins,
    requests: AccountLoginRequests,
  ) {
    this.app = app
    this.account = account
    this.logins = logins
    this.requests = requests
    app.boot.subscribe(() => {
      this.running = null
      this.observations.clear()
      this.missingNotices.clear()
      this.followOrgs()
    })
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

  /** A newer status invalidates reads that started before its observation. */
  observe(observation: LoginObservation): void {
    const account = this.account.get()
    if (!account || this.app.boot.get().state !== 'ready') return
    if (
      observation.login?.type === 'personal' &&
      observation.login.userId !== account.user.id
    )
      return
    const key = loginObservationKey(observation)
    if (this.observations.get(key)?.available === observation.available) return
    this.observations.set(key, {
      available: observation.available,
      readVersion: this.logins.readVersion(observation.agent),
    })
    const contradicted = contradictsLogin(account, observation)
    if (!observation.available || contradicted)
      this.logins.invalidateReads(observation.agent)
    if (contradicted) void this.start()
  }

  /** Only an accepted complete reply after the observation makes its default current. */
  current(observation: LoginObservation): boolean {
    const before = this.observations.get(loginObservationKey(observation))
    return (
      before?.available === observation.available &&
      this.logins.readVersion(observation.agent) > before.readVersion
    )
  }

  /** A notice reads at its appearance and keeps the visible-page timer due. */
  watchMissing(): () => void {
    if (this.app.boot.get().state !== 'ready') return () => undefined
    const notice = {}
    this.missingNotices.add(notice)
    void this.refresh()
    return () => {
      this.missingNotices.delete(notice)
      this.follow()
    }
  }

  /**
   * Reads one login after a change of a login of its agent, with the
   * caller's mark. The read also gives the default logins of that agent,
   * which the change can move to another login. The caller holds the
   * agent's request slot until this read applies.
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

  /** Queues a fresh account read, also while an older read is pending. */
  private start(): Promise<void> {
    this.clearTimer()
    const boot = this.app.boot.get()
    const show = this.logins.mark()
    const run: Promise<void> = this.requests
      .run(AGENTS, () => this.read(boot, show))
      .finally(() => {
        if (this.running !== run) return
        this.running = null
        this.follow()
      })
    this.running = run
    return run
  }

  private async read(
    boot: Boot,
    show: ReturnType<AgentLogins['mark']>,
  ): Promise<void> {
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
   * A shown missing-login notice also keeps the timer due.
   */
  private follow(): void {
    const account = this.account.get()
    const due =
      account !== null &&
      (this.missingNotices.size > 0 ||
        account.agentLogins.some(
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
