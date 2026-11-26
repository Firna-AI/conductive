import { useSyncExternalStore, type ReactElement } from 'react'
import type { ServicesStore } from './servicesStore'
import { initialServices, type ServicesState } from './servicesState'

/** The ports of the Preview tool, as the Services part opens them. */
export interface ServicePorts {
  /** The port of the Preview tab that shows on desktop, or null. */
  current: number | null
  /** A preview opens, so the ports wait, as the server rows do. */
  opening: boolean
  /** Opens the preview of a port, as a press on a server does. */
  onOpen: (port: number) => void
}

/**
 * The services of the Preview tool, which the shell gives: the store of the
 * workspace, and the Services part above the servers for a state of that
 * store. The part is null when none shows, as for older software, so the
 * tool shows as before.
 */
export interface PreviewServices {
  store: ServicesStore
  section: (state: ServicesState, ports: ServicePorts) => ReactElement | null
}

/** A tool without services: no store, and the state of no services. */
const noServices = {
  subscribe: () => () => undefined,
  getSnapshot: () => initialServices,
}

/** The state of the services of a tool, which reads none without them. */
export function useServicesState(
  services: PreviewServices | undefined,
): ServicesState {
  const store = services?.store ?? noServices
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
}
