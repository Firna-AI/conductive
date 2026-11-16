import { useEffect } from 'react'
import { workspaceAddress } from '../../app/last-workspaces'
import { parseRoute } from '../../app/router'
import type { Loadable } from '../../app/store'
import { useApp } from '../context'
import { toolOffered, toolPlace } from './tools/tool-address'
import { Unavailable } from './Unavailable'

/**
 * The view to remember. An address of a hidden tool, such as Desktop,
 * shows Terminal, so the memory keeps the workspace without that view, and
 * no link of the app names the hidden tool.
 */
function keptView(view: readonly string[]): readonly string[] {
  const place = toolPlace(view)
  return place && !toolOffered(place.tool) ? [] : view
}

/**
 * Keeps the workspace of the page as the last workspace of its org, while
 * the page shows it.
 */
export function useRememberWorkspace(
  page: {
    orgId: string
    workspaceId: string
    view: readonly string[]
    session?: string
  },
  detail: Loadable<unknown>,
): void {
  const last = useApp().lastWorkspaces
  // The address holds the view, so a new array with the same parts
  // remembers nothing again.
  const address = workspaceAddress({
    screen: 'workspace',
    ...page,
    view: keptView(page.view),
  })
  const shown = detail.state === 'ready'
  useEffect(() => {
    const route = parseRoute(address, '')
    if (shown && route.screen === 'workspace') last.remember(route)
  }, [last, address, shown])
}

/**
 * The page of a workspace that the Worker does not find. The org forgets
 * the workspace, so a switch to the org does not open it again.
 */
export function MissingWorkspace(props: {
  orgId: string
  workspaceId: string
}) {
  const last = useApp().lastWorkspaces
  const { orgId, workspaceId } = props
  useEffect(() => last.forget(orgId, workspaceId), [last, orgId, workspaceId])
  return <Unavailable body="It may have moved to another org." orgId={orgId} />
}
