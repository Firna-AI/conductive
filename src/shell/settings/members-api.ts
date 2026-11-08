import type { ApiClient } from '../../app/api/client'
import { createMembersApi, type MembersApi } from '../../members/api/client'
import type { Viewport as MembersViewport } from '../../members/ui/controls'
import { useOrgModel } from '../context'
import { useViewport } from '../ui/viewport'

/** The members client of each API client of the app. */
const clients = new WeakMap<ApiClient, MembersApi>()

/**
 * The client of the members UI for one org, over the transport of the app:
 * the fetch of the org's API client, so the web app and the Mac app keep
 * their origin and their credentials. That fetch takes each `org_suspended`
 * refusal, so a page with an old org list turns read-only at once. One API
 * client always gives the same members client, because a new client makes
 * a mounted part load its data again.
 */
export function useMembersApi(orgId: string): MembersApi {
  const { api } = useOrgModel(orgId).services
  let client = clients.get(api)
  if (!client) {
    client = createMembersApi(api.fetch)
    clients.set(api, client)
  }
  return client
}

/** The layout of the window, in the words of the members UI. */
export function useMembersViewport(): MembersViewport {
  return useViewport() === 'phone' ? 'mobile' : 'desktop'
}
