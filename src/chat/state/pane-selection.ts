import type { ChatSnapshot } from './chat-snapshot'

/** The session actually shown in a pane, or null while that pane shows a file. */
export function shownSessionId(
  snapshot: ChatSnapshot,
  pane: number = snapshot.view?.focusedPane ?? 0,
): string | null {
  if (!snapshot.view)
    return pane === 0 ? (snapshot.sessions[0]?.id ?? null) : null
  const active = snapshot.view.panes[pane]?.activeTab
  return active?.kind === 'session' ? active.sessionId : null
}

/** The last session of a row must still have a tab there. */
function lastSessionId(snapshot: ChatSnapshot, pane: number): string | null {
  const tabs = snapshot.view?.panes[pane]?.tabs ?? []
  const last = snapshot.lastSessionIds[pane]
  if (
    last &&
    tabs.some((tab) => tab.kind === 'session' && tab.sessionId === last)
  )
    return last
  return tabs.find((tab) => tab.kind === 'session')?.sessionId ?? null
}

/** The session for session actions and prompts, including a file-only view. */
export function sessionTarget(snapshot: ChatSnapshot): string | null {
  if (!snapshot.view) return snapshot.sessions[0]?.id ?? null
  const focus = snapshot.view.focusedPane
  const other = focus === 0 ? 1 : 0
  return (
    shownSessionId(snapshot, focus) ??
    shownSessionId(snapshot, other) ??
    lastSessionId(snapshot, focus) ??
    lastSessionId(snapshot, other)
  )
}

/** Each shown session loads, including the last session behind a file-only view. */
export function historySessionIds(snapshot: ChatSnapshot): readonly string[] {
  const shown = [
    shownSessionId(snapshot, 0),
    shownSessionId(snapshot, 1),
  ].filter((id): id is string => id !== null)
  const target = sessionTarget(snapshot)
  return [...new Set(shown.length > 0 ? shown : target ? [target] : [])]
}

/** Keeps a row's last session with its tabs when panes move or an empty pane closes. */
export function rememberPaneSessions(
  previous: ChatSnapshot,
  next: ChatSnapshot,
): ChatSnapshot {
  if (next.view === previous.view) return next
  const last = (pane: 0 | 1) => {
    const shown = shownSessionId(next, pane)
    if (shown) return shown
    const tabs = next.view?.panes[pane]?.tabs ?? []
    const stays = (id: string | null) =>
      id !== null &&
      tabs.some((tab) => tab.kind === 'session' && tab.sessionId === id)
    const own = previous.lastSessionIds[pane]
    const before = previous.view?.panes[pane]?.tabs ?? []
    const at = before.findIndex(
      (tab) => tab.kind === 'session' && tab.sessionId === own,
    )
    const neighbours = [
      ...before.slice(at + 1),
      ...before.slice(0, Math.max(at, 0)).toReversed(),
    ]
    const neighbour = neighbours.find(
      (tab) => tab.kind === 'session' && stays(tab.sessionId),
    )
    return (
      (stays(own) ? own : previous.lastSessionIds.find(stays)) ??
      (neighbour?.kind === 'session' ? neighbour.sessionId : null) ??
      tabs.find((tab) => tab.kind === 'session')?.sessionId ??
      null
    )
  }
  return { ...next, lastSessionIds: [last(0), last(1)] }
}
