import { createContext, useContext } from 'react'
import type { ApiClient } from './api/client'
import type { WorkspaceEventSource } from './events'

/** The storage of the panel widths, such as `localStorage`. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * What the app needs from outside: the API, the event stream, the clock,
 * and the browser storage. `main.tsx` gives the real ones, or the fake API
 * in development. Tests give their own.
 */
export interface AppServices {
  api: ApiClient
  events: WorkspaceEventSource
  /** The time now, in Unix milliseconds. */
  now: () => number
  /** The time zone of dates. `undefined` uses the browser's own. */
  timeZone?: string
  /** `null` when the browser keeps no storage, as in some private windows. */
  storage: KeyValueStorage | null
  /** A new unique ID, such as the client ID of a first message. */
  newId: () => string
  /** Opens a page that the Worker or another site serves, such as sign-in. */
  leave: (url: string) => void
  /** Copies text, such as the actions of a Boat key. */
  copy: (text: string) => Promise<void>
}

export const ServicesContext = createContext<AppServices | null>(null)

export function useServices(): AppServices {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('The app has no services.')
  return services
}

/** The storage of a browser window, or `null` when the browser refuses it. */
export function windowStorage(target: Window): KeyValueStorage | null {
  try {
    return target.localStorage
  } catch {
    return null
  }
}
