import { useEffect, useState } from 'react'
import { routeOf, useNavigation } from '../../app/navigation'
import { tabKey } from '../../chat/state/tab-order'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import type { WorkspaceContext } from './features'
import { filesHref } from './files/files-address'
import { useSavedView, useViewKnown } from './saved-view'
import { replaceWithoutVisit } from './tab-visits'
import { previewPortHref } from './tools/tool-address'

/** The address of a file, diff, or Preview tab, or null for a session. */
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
 * restore takes once. The screen keeps it for its whole show, so a new
 * mount of `RestoreShownTab`, such as at a switch between the phone and
 * the desktop layout, decides nothing again.
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
}

/** The arrival of this show of the screen, at its first address. */
export function useTabRestore(): TabRestore {
  const navigation = useNavigation()
  const [restore] = useState(() => new TabRestore(navigation.href()))
  return restore
}

/**
 * Shows the saved active tab again when the screen opens at the address of
 * the workspace alone, as a click on its row in the list does. So a return
 * shows the file, diff, or Preview tab that showed when the user left. The
 * address of that tab takes the place of the arrival address, and counts as
 * the address of the first show, so it starts no Resume. It decides once,
 * when the chat first knows the view. An address that names a view or a
 * session, a move to another address before then, a session that was
 * active, a phone, and an archived workspace keep the address.
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
  useEffect(() => {
    if (!known) return
    const arrival = restore.take()
    if (arrival === null) return
    const stayed = navigation.href() === arrival
    if (target !== null && stayed && bareAddress(arrival, workspaceId)) {
      replaceWithoutVisit(navigation, target)
    }
  }, [navigation, restore, known, target, workspaceId])
  return null
}
