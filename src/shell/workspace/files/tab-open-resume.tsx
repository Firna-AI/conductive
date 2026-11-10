import { useEffect, useEffectEvent } from 'react'
import { routeOf, useNavigation } from '../../../app/navigation'
import type { WorkspaceContext } from '../features'
import { filesPlace, tabOf } from './files-address'

/**
 * Whether the open of a file or diff tab resumes the sandbox: in the cases
 * where the open of the workspace resumes it, a stopped workspace and one
 * whose later start failed. A failed first start waits for Try again. A
 * refused start, an archived workspace, and a suspended org start nothing.
 */
function resumesAtTabOpen(context: WorkspaceContext): boolean {
  const { panel } = context
  if (context.readOnly || panel === null) return false
  return (
    panel.problem === 'stopped' ||
    (panel.problem === 'error' && panel.firstStart !== true)
  )
}

/** The file or diff tab of this workspace that an address names, as a key. */
function tabAt(href: string, orgId: string, workspaceId: string) {
  const route = routeOf(href)
  if (
    route.screen !== 'workspace' ||
    route.orgId !== orgId ||
    route.workspaceId !== workspaceId
  ) {
    return null
  }
  const tab = tabOf(filesPlace(route.view))
  return tab ? `${tab.kind}:${tab.path}` : null
}

/**
 * Resumes the sandbox at each visit that opens a file or diff tab, so that
 * the tab can read its file. A visit opens a tab when it moves to another
 * tab, or when it visits the address of the tab again, as a second click on
 * the tab or on its file does. Each click, link, and move back or forward
 * is a visit. A switch between the preview and the source of one file
 * keeps its tab. The address of the screen at its first show starts
 * nothing here, because the open of the workspace resumes the sandbox.
 */
export function ResumeOnTabOpen(props: { context: WorkspaceContext }): null {
  const navigation = useNavigation()
  const { org, workspace } = props.context
  const resumeIfDown = useEffectEvent(() => {
    if (resumesAtTabOpen(props.context)) props.context.resume.run()
  })
  useEffect(() => {
    let href = navigation.href()
    let tab = tabAt(href, org.id, workspace.id)
    return navigation.subscribe(() => {
      const visited = navigation.href()
      const opened = tabAt(visited, org.id, workspace.id)
      const opens = opened !== null && (opened !== tab || visited === href)
      href = visited
      tab = opened
      if (opens) resumeIfDown()
    })
  }, [navigation, org.id, workspace.id])
  return null
}
