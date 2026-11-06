import { createContext, useContext } from 'react'
import type { ApiClient } from './api/client'
import type { Delay, WorkspaceEventSource } from './events'
import type { Readable } from './store'

/** The storage of the panel widths, such as `localStorage`. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * What the app needs from outside: the API, the event stream, the clock,
 * the timers, the focus, the visibility, and the input of the page, and
 * the browser storage. `main.tsx` gives the real ones, or the fake API in
 * development. Tests give their own.
 */
export interface AppServices {
  api: ApiClient
  events: WorkspaceEventSource
  /** The time now, in Unix milliseconds. */
  now: () => number
  /** Runs a function later, such as the next read of a list. */
  delay: Delay
  /** Calls `listener` each time that the user comes back to the page. */
  onFocus: (listener: () => void) => () => void
  /**
   * Calls `listener` at each input of the user on the page: a key, typed
   * text, a press of the pointer, or a turn of the wheel.
   */
  onInput: (listener: () => void) => () => void
  /**
   * Whether the page shows, so that the user can see its output. A page
   * without the focus can still show, so this is not the focus.
   */
  visible: Readable<boolean>
  /** The time zone of dates. `undefined` uses the browser's own. */
  timeZone?: string
  /** `null` when the browser keeps no storage, as in some private windows. */
  storage: KeyValueStorage | null
  /** A new unique ID, such as the client ID of a first message. */
  newId: () => string
  /** Opens a page that the Worker or another site serves, such as sign-in. */
  leave: (url: string) => void
  /** Copies text, such as a command to paste elsewhere. */
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

/** The return to a browser window: it gets the focus, or its page shows again. */
export function windowFocus(target: Window): AppServices['onFocus'] {
  return (listener) => {
    const shown = () => {
      if (target.document.visibilityState === 'visible') listener()
    }
    target.addEventListener('focus', listener)
    target.document.addEventListener('visibilitychange', shown)
    return () => {
      target.removeEventListener('focus', listener)
      target.document.removeEventListener('visibilitychange', shown)
    }
  }
}

/** Whether the page of a browser window shows, as its document says. */
export function windowVisibility(target: Window): Readable<boolean> {
  const { document } = target
  return {
    get: () => document.visibilityState === 'visible',
    subscribe: (listener) => {
      document.addEventListener('visibilitychange', listener)
      return () => document.removeEventListener('visibilitychange', listener)
    },
  }
}

/** The events of the input of the user, as `onInput` counts them. */
const inputEvents = ['keydown', 'beforeinput', 'pointerdown', 'wheel'] as const

/**
 * The input of the user in a browser window. It listens in the capture
 * phase, so that it hears an event before an element of the page can stop
 * it, as a text field does with its keys.
 */
export function windowInput(target: Window): AppServices['onInput'] {
  return (listener) => {
    const options = { capture: true, passive: true }
    for (const type of inputEvents) {
      target.addEventListener(type, listener, options)
    }
    return () => {
      for (const type of inputEvents) {
        target.removeEventListener(type, listener, options)
      }
    }
  }
}
