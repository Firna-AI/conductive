import { useEffect, useEffectEvent } from 'react'
import { routeOf, useNavigation, type Navigation } from '../../app/navigation'
import { tabKey } from '../../chat/state/tab-order'
import type { WorkspaceContext } from './features'
import { filesPlace, tabOf } from './files/files-address'
import { skillPlace } from './skills/skill-address'
import { toolPlace } from './tools/tool-address'

/**
 * The file, diff, skill, or Preview tab of this workspace that an address
 * names, as a key, such as `file:src/app.ts` or `preview:3000`. Only the
 * desktop has Preview tabs, at `preview/port/<port>`.
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
  const skill = skillPlace(route.view)
  if (skill) return tabKey({ kind: 'skill', ...skill })
  const place = toolPlace(route.view)
  return desktop && place?.tool === 'preview' && place.port !== null
    ? `preview:${place.port}`
    : null
}

/** The address that `replaceWithoutVisit` puts in place, during its call. */
let restoring: string | null = null

/**
 * Replaces the address with `to`, as the address of the first show of the
 * screen, so that the move is no visit. The restore of the saved tab moves
 * the address in this way.
 */
export function replaceWithoutVisit(navigation: Navigation, to: string): void {
  restoring = to
  try {
    navigation.replace(to)
  } finally {
    restoring = null
  }
}

/**
 * Calls `onOpen` with the key of the tab at each visit that opens a file,
 * diff, skill, or Preview tab of the workspace. A visit opens a tab when it
 * moves to another tab, or when it visits the address of the tab again, as
 * a second click on the tab, on its file, on its chip, or on its port does.
 * Each click, link, and move back or forward is a visit. A switch between
 * the preview and the source of one file keeps its tab. The address of the
 * screen at its first show calls nothing, and nor does an address that
 * `replaceWithoutVisit` puts in its place.
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
      const restored = restoring !== null && visited === restoring
      const opens =
        !restored && opened !== null && (opened !== tab || visited === href)
      href = visited
      tab = opened
      if (opened !== null && opens) open(opened)
    })
  }, [navigation, org.id, workspace.id, desktop])
}
