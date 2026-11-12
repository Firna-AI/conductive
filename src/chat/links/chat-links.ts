import { useMemo, useSyncExternalStore } from 'react'
import type { ChatSnapshot } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import type { ChatLinks } from './LinksContext'
import { sessionLinks } from './session-links'
import { originOf } from './workspace-links'

/**
 * The workspaces that the chips of a chat find, as the list of the org has
 * them now, the sessions that its session chips find, the way that a chip
 * opens its page, and the origin of the link of the chat's workspace. The
 * sessions of the workspace of the chat are its live sessions, open and
 * closed. Each other workspace gets one read of its sessions for each load
 * of the chat.
 */
export function useChatLinksOf(
  controller: ChatController,
  snapshot: ChatSnapshot,
  open: ((to: string) => void) | undefined,
): ChatLinks {
  const list = controller.workspaceList.workspaces
  const workspaces = useSyncExternalStore(list.subscribe, list.get, list.get)
  const reads = controller.sessionReads
  const read = useSyncExternalStore(
    reads.subscribe,
    reads.getSnapshot,
    reads.getSnapshot,
  )
  const { orgId, workspaceId } = controller.target
  const { sessions: openSessions, history } = snapshot
  const sessions = useMemo(
    () =>
      sessionLinks(
        { workspaceId, sessions: [...openSessions, ...history] },
        reads,
        read,
      ),
    [workspaceId, openSessions, history, reads, read],
  )
  const links = useMemo(() => ({ orgId, workspaces }), [orgId, workspaces])
  const link = snapshot.workspace?.link
  const origin = link === undefined ? undefined : (originOf(link) ?? undefined)
  return useMemo(
    () => ({ links, open, sessions, origin }),
    [links, open, sessions, origin],
  )
}
