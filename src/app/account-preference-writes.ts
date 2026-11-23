import type { AgentChoice } from '../shared/generated/AgentChoice'
import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type NewWorkspaceView,
  type SetFavouritesRequest,
} from '../shared/account'
import type { SaveShortcutsRequest } from '../shared/shortcuts'
import { items, nested, record } from './api/parse'
import { readChoice, readNewWorkspaceView } from './api/read-core'
import { readSavedShortcuts } from './api/read-shortcuts'
import type { AppServices } from './services'
import type { Store } from './store'

/**
 * The saves of the preferences of the account: the default model, the
 * model favourites, the New workspace view, and the shortcut changes. Each
 * save changes `account` only after its reply, to the value of the reply.
 * A failed save changes nothing, so the account keeps the saved value, and
 * the save fails with the error, which its caller shows.
 */
export class AccountPreferenceWrites {
  private readonly services: AppServices
  private readonly account: Store<AccountResponse | null>

  constructor(services: AppServices, account: Store<AccountResponse | null>) {
    this.services = services
    this.account = account
  }

  async setDefaultChoice(choice: AgentChoice): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      ACCOUNT_PATHS.defaultModel,
      { choice },
      (body) => nested(record(body), 'choice', readChoice),
    )
    this.change((account) => ({ ...account, defaultChoice: saved }))
  }

  /**
   * Saves the whole list of the favourites, in the order of the menu. The
   * account then holds the list of the reply, which the Worker cleans: it
   * turns fast mode off for a model without fast mode, keeps the first of
   * two equal favourites, and keeps the first five.
   */
  async setFavourites(favourites: readonly AgentChoice[]): Promise<void> {
    const request: SetFavouritesRequest = { favourites }
    const saved = await this.services.api.send(
      'PUT',
      ACCOUNT_PATHS.favourites,
      request,
      (body) => items(record(body), 'favourites', readChoice),
    )
    this.change((account) => ({ ...account, favourites: saved }))
  }

  async setNewWorkspaceView(view: NewWorkspaceView): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      ACCOUNT_PATHS.newWorkspaceView,
      { view },
      readNewWorkspaceView,
    )
    this.change((account) => ({ ...account, newWorkspaceView: saved.view }))
  }

  /**
   * Saves the shortcut changes of one keyboard in one batch: all of them or
   * none. The reply holds every change of that keyboard, which the keymap
   * of the keys and of each hint read from the account.
   */
  async saveShortcuts(request: SaveShortcutsRequest): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      ACCOUNT_PATHS.shortcuts,
      request,
      readSavedShortcuts,
    )
    this.change((account) => ({
      ...account,
      shortcuts: { ...account.shortcuts, [saved.keyboard]: saved.changes },
    }))
  }

  /** Changes the account that shows, if one shows. */
  private change(update: (account: AccountResponse) => AccountResponse): void {
    const account = this.account.get()
    if (account) this.account.set(update(account))
  }
}
