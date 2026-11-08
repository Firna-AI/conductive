import { randomToken } from '../security/crypto'
import type { BrowserAccess } from './browser-authorization'
import type { BrowserTabs } from './browser-tabs'
import type { ChatOperation } from './operation'
import type { ChatStore } from './store'
import type { BrowserPeer } from './types'

interface BrowserSubscriptionOptions {
  store: ChatStore
  browsers: BrowserTabs
  operation: ChatOperation
  access: BrowserAccess
  after: number
  peer: BrowserPeer
}

export function subscribeBrowser({
  store,
  browsers,
  operation,
  access,
  after,
  peer,
}: BrowserSubscriptionOptions): Promise<() => void> {
  return store.run(async () => {
    if (access.workspace.archivedAt === null) await operation.logins.refresh()
    const tabId = randomToken()
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
        tabId,
      )
      .catch((error: unknown) => {
        try {
          peer.close()
        } catch {
          // The peer has already disconnected.
        }
        throw error
      })
    try {
      let through: number | undefined
      while (true) {
        const history = await store.read(access.workspace.id, (view) =>
          view.history(after, through),
        )
        browsers.check(peer)
        peer.send({ type: 'history', history })
        if (!history.hasMore) break
        through = history.throughEventNumber
        after = history.nextAfterEventNumber
      }
      return unsubscribe
    } catch (error) {
      unsubscribe()
      throw error
    }
  })
}
