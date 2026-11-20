import type { Agent } from '../shared/generated/Agent'
import { ACCOUNT_PATHS, type AccountResponse } from '../shared/account'
import { AccountLoginFacts } from './account-login-facts'
import type { AccountLoginRequests } from './account-login-requests'
import { AccountPreferences } from './account-preferences'
import type { AgentLogins, LoginMark } from './agent-logins'
import { AGENTS, readAccount } from './api/read-core'
import type { AppModel } from './app-model'
import type { Boot } from './boot'
import { inOrgs, orgLoginsInUse } from './default-logins'
import { modelListWait } from './endpoint-models'
import { contradictsLogin, type LoginObservation } from './login-observation'
import { Refresher } from './refresh'
import { loading, ready, Store } from './store'

interface AccountRead {
  boot: Boot
  agents: readonly Agent[]
  at: number | null
}

/**
 * The account read owner. Whole reads join both login queues. A read after
 * a login action stays in its caller's slot. Each GET takes its order at
 * dispatch, apart from its caller's local-change mark. Only complete
 * replies write default logins. Facts only guard replies or request reads.
 */
export class AccountLoginReads {
  readonly preferences: AccountPreferences
  private refresher: Refresher<AccountResponse>
  private stop: (() => void) | null = null
  private facts: AccountLoginFacts
  private readonly pending = new Set<AccountRead>()
  private activeOrgs: ReadonlySet<string> | null = null
  private readonly missingNotices = new Set<object>()
  private readonly reasons = new Store(0)
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
    this.preferences = new AccountPreferences(app, account)
    this.facts = new AccountLoginFacts(logins)
    this.refresher = this.createRefresher()
    app.boot.subscribe(() => {
      this.stop?.()
      this.stop = null
      this.facts = new AccountLoginFacts(logins)
      this.pending.clear()
      this.missingNotices.clear()
      this.refresher = this.createRefresher()
      this.followOrgs()
      if (app.boot.get().state === 'ready') this.stop = this.refresher.watch()
    })
    app.orgs.subscribe(() => this.followOrgs())
  }

  private createRefresher(): Refresher<AccountResponse> {
    const boot = this.app.boot.get()
    return new Refresher(
      {
        read: () =>
          this.app.boot.get() === boot ? this.start() : Promise.resolve(),
        store: {
          get: () => {
            const account = this.account.get()
            return account ? ready(account) : loading
          },
          subscribe: (listener) => {
            const stops = [this.account, this.app.orgs, this.reasons].map(
              (store) => store.subscribe(listener),
            )
            return () => stops.forEach((stop) => stop())
          },
        },
      },
      () => this.wait(),
      this.app.services,
      { visible: this.app.services.visible, readOnWatch: false },
    )
  }

  /** Reads the whole account. A read that waits or runs already counts. */
  refresh(): Promise<void> {
    if (this.app.boot.get().state !== 'ready') return Promise.resolve()
    return this.refresher.refresh()
  }

  observe(observation: LoginObservation): void {
    const account = this.account.get()
    if (!account || this.app.boot.get().state !== 'ready') return
    const at = this.facts.observe(account, observation)
    if (at !== null && contradictsLogin(account, observation))
      this.repair(observation.agent, at)
  }

  /** Only accepted complete replies that name defaults advance this proof. */
  current(observation: LoginObservation): boolean {
    return this.facts.current(observation)
  }

  watchMissing(): () => void {
    if (this.app.boot.get().state !== 'ready') return () => undefined
    const notice = {}
    this.missingNotices.add(notice)
    void this.refresh()
    return () => {
      this.missingNotices.delete(notice)
      this.reasons.change((count) => count + 1)
    }
  }

  /** The caller holds its agent's request slot through this fresh read. */
  readAgent(agent: Agent, show: LoginMark): Promise<void> {
    return this.read(
      { boot: this.app.boot.get(), agents: [agent], at: null },
      show,
      agent,
    )
  }

  /** Captures local intent before this whole read waits for both queues. */
  private start(): Promise<void> {
    const read: AccountRead = {
      boot: this.app.boot.get(),
      agents: AGENTS,
      at: null,
    }
    const show = this.logins.mark()
    this.pending.add(read)
    return this.requests
      .run(AGENTS, () => this.read(read, show))
      .catch(() => undefined)
      .finally(() => this.pending.delete(read))
  }

  private async read(
    read: AccountRead,
    show: LoginMark,
    only?: Agent,
  ): Promise<void> {
    this.pending.add(read)
    try {
      await this.preferences.read(
        () => this.fetch(read, show, only),
        () => this.app.boot.get() === read.boot,
      )
    } finally {
      this.pending.delete(read)
    }
  }

  /** Every account GET of this owner takes its order here, at dispatch. */
  private async fetch(
    read: AccountRead,
    show: LoginMark,
    only?: Agent,
  ): Promise<AccountResponse> {
    const at = this.facts.begin()
    read.at = at
    const account = await this.app.services.api.get(
      ACCOUNT_PATHS.account,
      readAccount,
    )
    if (this.app.boot.get() !== read.boot) return account
    show(account, only, (agent) => {
      const accepted = this.facts.accept(account, agent, at)
      if (accepted.kind === 'repair') this.repair(agent, accepted.after)
      return accepted.kind === 'accepted'
    })
    return account
  }

  private repair(agent: Agent, after: number): void {
    const newer = [...this.pending].some(
      (read) =>
        read.agents.includes(agent) && (read.at === null || read.at > after),
    )
    if (!newer) void this.refresher.reread()
  }

  /** An org join needs fresh defaults; a leave hides them through inOrgs. */
  private followOrgs(): void {
    if (this.app.boot.get().state !== 'ready') {
      this.activeOrgs = null
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
    if (!joined || !this.logins.namesDefaults()) return
    for (const agent of AGENTS) this.logins.change(agent)
    void this.refresher.reread()
  }

  /** Keeps every existing timer reason; Refresher applies account visibility. */
  private wait(): number | null {
    const account = this.account.get()
    const due =
      account !== null &&
      (this.missingNotices.size > 0 ||
        account.agentLogins.some(
          (login) => login.connected && login.kind === 'endpoint',
        ) ||
        orgLoginsInUse(inOrgs(account, this.app.orgs.get())))
    return this.app.boot.get().state === 'ready' && due ? modelListWait : null
  }
}
