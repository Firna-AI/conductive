import type { ApiClient } from '../../app/api/client'
import { useServices } from '../../app/services'
import { createMembersApi, type MembersApi } from '../../members/api/client'
import type { Viewport as MembersViewport } from '../../members/ui/controls'
import { useViewport } from '../ui/viewport'

/** The members client of each API client of the app. */
const clients = new WeakMap<ApiClient, MembersApi>()

/**
 * The client of the members UI over the transport of the app: the fetch of
 * its API client, so the web app and the Mac app keep their origin and
 * their credentials. One API client always gives the same members client,
 * because a new client makes a mounted part load its data again.
 */
export function useMembersApi(): MembersApi {
  const { api } = useServices()
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
