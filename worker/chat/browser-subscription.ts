import { randomToken } from '../security/crypto'
import type { BrowserAccess } from './browser-authorization'
import type { BrowserTabs, BrowserPersistence } from './browser-tabs'
import type { SessionLogins } from './session-login'
import type { ChatStore } from './store'
import type { WorkspaceEventPeer } from './workspace-events'

/**
 * The most JSON text, in UTF-16 code units, that the history pages of one
 * connection send: 8 MiB. Each page waits in the memory of the Durable
 * Object until the tab reads it. So a longer replay closes the connection,
 * and the tab connects again after its last page.
 */
export const REPLAY_BUDGET = 8 * 1024 * 1024

interface BrowserSubscriptionOptions {
  store: ChatStore
  browsers: BrowserTabs
  /** The logins of the sessions, which an active workspace refreshes first. */
  operation: { logins: Pick<SessionLogins, 'refresh'> }
  access: {
    workspace: BrowserAccess['workspace']
    context: Pick<BrowserAccess['context'], 'sessionId'> & {
      user: Pick<BrowserAccess['context']['user'], 'id'>
    }
  }
  after: number
  peer: WorkspaceEventPeer
  persist?: BrowserPersistence
  /** The replay budget of the connection. The default is `REPLAY_BUDGET`. */
  budget?: number
}

/** A new tab: its registration first, then the replay of its history. */
export interface BrowserSubscription {
  /**
   * Settles once the tab is registered with a valid grant, before its first
   * history page. It rejects with the refusal of the tab.
   */
  registered: Promise<void>
  /**
   * Settles when the replay ends, with the removal of the tab. A replay that
   * reaches the budget has already removed and closed the tab. A failed
   * replay removes the tab and rejects.
   */
  replayed: Promise<() => void>
}

/** Closes a tab that can already be gone. */
export function closeTab(peer: WorkspaceEventPeer): void {
  try {
    peer.close()
  } catch {
    // The tab has already disconnected.
  }
}

/**
 * Registers the tab and replays its history in one task of the chat queue,
 * so no event falls between them and no event comes twice. The tab gets each
 * live event after the task.
 */
export function subscribeBrowser(
  options: BrowserSubscriptionOptions,
): BrowserSubscription {
  const { store, browsers, operation, access, peer, persist } = options
  let markRegistered: () => void = () => undefined
  const registration = new Promise<void>((resolve) => {
    markRegistered = resolve
  })
  const replayed = store.run(async () => {
    if (access.workspace.archivedAt === null) await operation.logins.refresh()
    const unsubscribe = await browsers
      .add(
        peer,
        {
          kind: 'workspace',
          workspaceId: access.workspace.id,
          orgId: access.workspace.orgId,
          userId: access.context.user.id,
          sessionId: access.context.sessionId,
        },
        randomToken(),
        persist,
      )
      .catch((error: unknown) => {
        closeTab(peer)
        throw error
      })
    try {
      browsers.check(peer)
      markRegistered()
      if (!(await replay(options))) {
        unsubscribe()
        closeTab(peer)
      }
      return unsubscribe
    } catch (error) {
      unsubscribe()
      throw error
    }
  })
  return {
    registered: Promise.race([registration, replayed.then(() => undefined)]),
    replayed,
  }
}

/**
 * Sends the stored history after `after` in pages that share one cutoff.
 * It returns false when the budget ends the replay before its final page.
 */
async function replay({
  store,
  browsers,
  access,
  peer,
  after,
  budget = REPLAY_BUDGET,
}: BrowserSubscriptionOptions): Promise<boolean> {
  let through: number | undefined
  let sent = 0
  while (true) {
    const history = await store.read(access.workspace.id, (view) =>
      view.history(after, through),
    )
    browsers.check(peer)
    peer.send({ type: 'history', history })
    if (!history.hasMore) return true
    sent += JSON.stringify(history).length
    if (sent >= budget) return false
    through = history.throughEventNumber
    after = history.nextAfterEventNumber
  }
}
