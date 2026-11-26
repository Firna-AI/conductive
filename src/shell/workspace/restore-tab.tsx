import { useEffect, useEffectEvent, useState } from 'react'
import { routeOf, useNavigation } from '../../app/navigation'
import { viewShowing } from '../../chat/state/sessions'
import { tabKey } from '../../chat/state/tab-order'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import type { WorkspaceContext } from './features'
import { filesHref } from './files/files-address'
import { saveView, useSavedView, useViewKnown } from './saved-view'
import { skillHref } from './skills/skill-address'
import { replaceWithoutVisit } from './tab-visits'
import { previewPortHref } from './tools/tool-address'

/** The address of a file, diff, Preview, or skill tab, or null for a session. */
function tabHref(
  orgId: string,
  workspaceId: string,
  tab: WorkspaceTab,
): string | null {
  switch (tab.kind) {
    case 'file':
      return filesHref(orgId, workspaceId, {
        kind: 'file',
        path: tab.path,
        mode: tab.mode,
      })
    case 'diff':
      return filesHref(orgId, workspaceId, { kind: 'diff', path: tab.path })
    case 'preview':
      return previewPortHref(orgId, workspaceId, tab.port)
    case 'skill':
      return skillHref(orgId, workspaceId, tab)
    case 'session':
      return null
  }
}

/** Whether an address is the workspace alone: no view and no session. */
function bareAddress(href: string, workspaceId: string): boolean {
  const route = routeOf(href)
  return (
    route.screen === 'workspace' &&
    route.workspaceId === workspaceId &&
    route.view.length === 0 &&
    route.session === undefined
  )
}

/** The address of the saved active tab, when it is open and not a session. */
function savedTabHref(
  context: WorkspaceContext,
  view: WorkspaceView,
): string | null {
  const active = view.activeTab
  if (active === null) return null
  const open = view.tabs.some((tab) => tabKey(tab) === tabKey(active))
  return open ? tabHref(context.org.id, context.workspace.id, active) : null
}

/**
 * The arrival of one show of the screen: its first address, which the
 * restore takes once. The first move of the address drops it, so a move
 * away and back before the view is known restores nothing. The screen
 * keeps it for its whole show, so a new mount of `RestoreShownTab`, such
 * as at a switch between the phone and the desktop layout, decides
 * nothing again.
 */
export class TabRestore {
  private arrival: string | null

  constructor(arrival: string) {
    this.arrival = arrival
  }

  /** The arrival address at the first call, and null after it. */
  take(): string | null {
    const { arrival } = this
    this.arrival = null
    return arrival
  }

  /** Forgets the arrival, after a move of the address. */
  drop(): void {
    this.arrival = null
  }
}

/** The arrival of this show of the screen, at its first address. */
export function useTabRestore(): TabRestore {
  const navigation = useNavigation()
  const [restore] = useState(() => new TabRestore(navigation.href()))
  useEffect(
    () => navigation.subscribe(() => restore.drop()),
    [navigation, restore],
  )
  return restore
}

/**
 * The view with the shown session as the active tab, when a file, diff,
 * Preview, or skill tab was active. The same view otherwise, so nothing
 * saves.
 */
function showingChat(
  view: WorkspaceView,
  sessionId: string | null,
): WorkspaceView {
  const active = view.activeTab
  if (active === null || active.kind === 'session') return view
  return sessionId === null
    ? { ...view, activeTab: null }
    : viewShowing(view, sessionId)
}

/**
 * Saves the shown session as the active tab at each move of the address
 * to the workspace alone, such as a move back from a tab, while a file,
 * diff, Preview, or skill tab is active. The chat shows there, so a later
 * return shows the chat again.
 */
function useChatAtBareAddress(context: WorkspaceContext, shows: boolean): void {
  const navigation = useNavigation()
  const workspaceId = context.workspace.id
  const save = useEffectEvent(() => {
    const { savedView } = context
    const shown = savedView.getSnapshot().activeSessionId
    saveView(savedView, (view) => showingChat(view, shown))
  })
  useEffect(() => {
    if (!shows) return
    return navigation.subscribe(() => {
      if (bareAddress(navigation.href(), workspaceId)) save()
    })
  }, [navigation, shows, workspaceId])
}

/**
 * Shows the saved active tab again when the screen opens at the address of
 * the workspace alone, as a click on its row in the list does. So a return
 * shows the file, diff, Preview, or skill tab that showed when the user
 * left. The address of that tab takes the place of the arrival address, and
 * counts as the address of the first show, so it starts no Resume. It
 * decides once, when the chat first knows the view. An address that names
 * a view or a session, a move of the address before then, a session that
 * was active, a phone, and an archived workspace keep the address. A later
 * move to the address of the workspace alone makes the shown session
 * active, as `useChatAtBareAddress` says.
 */
export function RestoreShownTab(props: {
  context: WorkspaceContext
  restore: TabRestore
}): null {
  const { context, restore } = props
  const navigation = useNavigation()
  const known = useViewKnown(context.savedView)
  const view = useSavedView(context.savedView)
  const shows = context.viewport !== 'phone' && context.sandbox !== 'archived'
  const workspaceId = context.workspace.id
  const target = view && shows ? savedTabHref(context, view) : null
  useChatAtBareAddress(context, shows)
  useEffect(() => {
    if (!known) return
    const arrival = restore.take()
    if (
      target !== null &&
      arrival !== null &&
      bareAddress(arrival, workspaceId)
    ) {
      replaceWithoutVisit(navigation, target)
    }
  }, [navigation, restore, known, target, workspaceId])
  return null
}
