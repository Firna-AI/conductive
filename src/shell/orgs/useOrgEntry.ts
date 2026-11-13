import { useCallback } from 'react'
import { orgEntry } from '../../app/last-workspaces'
import { useStore } from '../../app/store'
import { useApp } from '../context'

/**
 * The page that opens an org from the rail, its keys, and the palette: the
 * last workspace that the person opened in the org, or else its list page.
 */
export function useOrgEntry(): (orgId: string) => string {
  const state = useStore(useApp().lastWorkspaces.state)
  return useCallback((orgId: string) => orgEntry(state, orgId), [state])
}
