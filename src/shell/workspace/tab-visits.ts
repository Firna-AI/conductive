import { useEffect, useEffectEvent } from 'react'
import { routeOf, useNavigation } from '../../app/navigation'
import type { WorkspaceContext } from './features'
import { filesPlace, tabOf } from './files/files-address'
import { toolPlace } from './tools/tool-address'

/**
 * The file, diff, or Preview tab of this workspace that an address names,
 * as a key, such as `file:src/app.ts` or `preview:3000`. Only the desktop
 * has Preview tabs, at `preview/port/<port>`.
 */
function tabAt(
  href: string,
  orgId: string,
  workspaceId: string,
  desktop: boolean,
): string | null {
  const route = routeOf(href)
  if (
    route.screen !== 'workspace' ||
    route.orgId !== orgId ||
    route.workspaceId !== workspaceId
  ) {
    return null
  }
  const tab = tabOf(filesPlace(route.view))
  if (tab) return `${tab.kind}:${tab.path}`
  const place = toolPlace(route.view)
  return desktop && place?.tool === 'preview' && place.port !== null
    ? `preview:${place.port}`
    : null
}

/**
 * Calls `onOpen` with the key of the tab at each visit that opens a file,
 * diff, or Preview tab of the workspace. A visit opens a tab when it moves
 * to another tab, or when it visits the address of the tab again, as a
 * second click on the tab, on its file, or on its port does. Each click,
 * link, and move back or forward is a visit. A switch between the preview
 * and the source of one file keeps its tab. The address of the screen at
 * its first show calls nothing.
 */
export function useTabVisits(
  context: WorkspaceContext,
  onOpen: (tab: string) => void,
): void {
  const navigation = useNavigation()
  const { org, workspace } = context
  const desktop = context.viewport !== 'phone'
  const open = useEffectEvent(onOpen)
  useEffect(() => {
    let href = navigation.href()
    let tab = tabAt(href, org.id, workspace.id, desktop)
    return navigation.subscribe(() => {
      const visited = navigation.href()
      const opened = tabAt(visited, org.id, workspace.id, desktop)
      const opens = opened !== null && (opened !== tab || visited === href)
      href = visited
      tab = opened
      if (opened !== null && opens) open(opened)
    })
  }, [navigation, org.id, workspace.id, desktop])
}
