import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type NewWorkspaceView,
} from '../shared/account'
import type { AgentChoice } from '../shared/generated/AgentChoice'
import type { SaveShortcutsRequest } from '../shared/shortcuts'
import { nested, record } from './api/parse'
import { readChoice, readNewWorkspaceView } from './api/read-core'
import { readSavedShortcuts } from './api/read-shortcuts'
import type { AppModel } from './app-model'
import { Resource, same, type Change } from './resource'
import type { AppServices } from './services'
import type { Store } from './store'

type AccountFields = Omit<AccountResponse, 'agentLogins' | 'defaultLogins'>

function fields(account: AccountResponse): AccountFields {
  return {
    user: account.user,
    operator: account.operator,
    defaultChoice: account.defaultChoice,
    newWorkspaceView: account.newWorkspaceView,
    shortcuts: account.shortcuts,
    githubAppUrl: account.githubAppUrl,
  }
}

/** Non-login account fields, with each confirmed write kept over older reads. */
export class AccountPreferences {
  private resource: Resource<AccountFields> | null = null
  private readonly services: AppServices

  constructor(app: AppModel, account: Store<AccountResponse | null>) {
    this.services = app.services
    app.boot.subscribe(() => {
      this.resource = null
      const boot = app.boot.get()
      const initial = account.get()
      if (boot.state !== 'ready' || !initial) return
      const resource = new Resource(
        () => Promise.resolve(fields(initial)),
        {},
        fields(initial),
      )
      this.resource = resource
      resource.store.subscribe(() => {
        const shown = resource.store.get()
        const current = account.get()
        if (app.boot.get() === boot && current && shown.state === 'ready')
          account.set({ ...current, ...shown.value })
      })
    })
  }

  /** A caller-slot read uses the same resource without joining the login queue again. */
  async read(
    fetch: () => Promise<AccountResponse>,
    current: () => boolean,
  ): Promise<void> {
    const resource = this.resource
    if (!resource || !current()) return
    const reply = fetch()
    await resource.read(current, () => reply.then(fields))
    await reply
  }

  refuseOperator(): void {
    const change = (account: AccountFields) => ({ ...account, operator: false })
    void this.resource?.write(
      change,
      () => Promise.resolve(),
      () => change,
    )
  }

  setDefaultChoice(choice: AgentChoice): Promise<void> {
    return this.write(
      () =>
        this.services.api.send(
          'PUT',
          ACCOUNT_PATHS.defaultModel,
          { choice },
          (body) => nested(record(body), 'choice', readChoice),
        ),
      (saved) => (account) => ({ ...account, defaultChoice: saved }),
    )
  }

  setNewWorkspaceView(view: NewWorkspaceView): Promise<void> {
    return this.write(
      () =>
        this.services.api.send(
          'PUT',
          ACCOUNT_PATHS.newWorkspaceView,
          { view },
          readNewWorkspaceView,
        ),
      (saved) => (account) => ({ ...account, newWorkspaceView: saved.view }),
    )
  }

  saveShortcuts(request: SaveShortcutsRequest): Promise<void> {
    return this.write(
      () =>
        this.services.api.send(
          'PUT',
          ACCOUNT_PATHS.shortcuts,
          request,
          readSavedShortcuts,
        ),
      (saved) => (account) => ({
        ...account,
        shortcuts: { ...account.shortcuts, [saved.keyboard]: saved.changes },
      }),
    )
  }

  /** A queued save of a previous boot sends nothing into the current account. */
  private async write<A>(
    send: () => Promise<A>,
    commit: (saved: A) => Change<AccountFields>,
  ): Promise<void> {
    const resource = this.resource
    if (!resource) return
    await resource.write(
      same,
      () => (this.resource === resource ? send() : Promise.resolve(null)),
      (saved) => (saved === null ? same : commit(saved)),
    )
  }
}
