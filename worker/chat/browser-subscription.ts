import { randomToken } from '../security/crypto'
import type { BrowserAccess } from './browser-authorization'
import type { BrowserTabs, BrowserPersistence } from './browser-tabs'
import type { SessionLogins } from './session-login'
import type { ChatStore } from './store'
import type { WorkspaceEventPeer } from './workspace-events'

/**
 * The most UTF-8 JSON bytes of events that the history pages of one
 * connection send: 8 MiB. Each page waits in the memory of the Durable
 * Object until the tab reads it. So a longer replay closes the connection,
 * and the tab connects again after its last page.
 */
const REPLAY_BUDGET = 8 * 1024 * 1024

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
  /** Runs once the tab is registered with a valid grant, before its history. */
  registered?: () => void
  /** The replay budget of the connection, in bytes. The default is 8 MiB. */
  budget?: number
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
 * The caller holds the queue task from label preparation through replay.
 * Registers the tab and replays its history in that task of the chat queue,
 * so no event falls between them and no event comes twice. The tab gets each
 * live event after the task. The promise settles when the replay ends, with
 * the removal of the tab. A refusal closes the tab and rejects. A replay that
 * reaches the budget, or fails, removes and closes the tab once, so the tab
 * connects again after its last page. A failed replay also rejects.
 */
export async function subscribeBrowser(
  options: BrowserSubscriptionOptions,
): Promise<() => void> {
  const { browsers, operation, access, peer, persist } = options
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
    options.registered?.()
    if (!(await replay(options))) browsers.close(peer)
    return unsubscribe
  } catch (error) {
    browsers.close(peer)
    throw error
  }
}

/**
 * Sends the stored history after `after` in pages that share one cutoff.
 * The page reads spend the budget. It returns false when the budget ends
 * the replay before its final page.
 */
async function replay({
  store,
  browsers,
  access,
  peer,
  after,
  budget = REPLAY_BUDGET,
}: BrowserSubscriptionOptions): Promise<boolean> {
  const left = { bytes: budget }
  let through: number | undefined
  while (true) {
    const history = await store.read(access.workspace.id, (view) =>
      view.history(after, through, { budget: left }),
    )
    browsers.check(peer)
    peer.send({ type: 'history', history })
    if (!history.hasMore) return true
    if (left.bytes <= 0) return false
    through = history.throughEventNumber
    after = history.nextAfterEventNumber
  }
}
