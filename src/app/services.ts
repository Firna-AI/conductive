import { createContext, useContext } from 'react'
import type { ShortcutKeyboard } from '../shared/shortcut-key'
import type { ApiClient } from './api/client'
import type { Delay, WorkspaceEventSource } from './events'
import { detectShortcutHost, type ShortcutHost } from './shortcuts/host'
import {
  LayoutSwitchKeys,
  type LayoutModifiers,
} from './shortcuts/layout-switch'
import type { Readable } from './store'

/** The storage of the panel widths, such as `localStorage`. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * The keyboard of the person: a Mac, with ⌘, or Windows and Linux, with
 * Ctrl. It chooses the defaults and the text of the shortcut hints.
 */
export type Platform = ShortcutKeyboard

/** A press of a key on the page. A browser gives its `KeyboardEvent`. */
export interface KeyPress {
  readonly key: string
  readonly code: string
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly shiftKey: boolean
  /** The key stays down, so the press repeats. */
  readonly repeat: boolean
  /** The press is part of a composition, such as an accented letter. */
  readonly isComposing: boolean
  /** Modifiers taken by held layout switch keys, or null when none is held. */
  readonly layoutModifiers: LayoutModifiers
  /** The element that has the focus. */
  readonly target: EventTarget | null
  /** Stops the own action of the browser for the key. */
  preventDefault(): void
  /** Stops the press before an element of the page hears it. */
  stopPropagation(): void
}

interface KeySource {
  (listener: (press: KeyPress) => void): () => void
  /** The same switch state for a recorder's own key event. */
  readonly layoutModifiers: () => LayoutModifiers
}

/**
 * What the app needs from outside: the API, the event stream, the clock,
 * the timers, the focus, the visibility, the input, and the keys of the
 * page, the keyboard of the person, and the browser storage. `main.tsx`
 * gives the real ones, or the fake API in development. Tests give their
 * own.
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
   * Calls `listener` at each key press on the page, before an element of
   * the page hears it. The listener can stop the browser's own action
   * and delivery to an element.
   */
  onKey: KeySource
  /** The keyboard of the person, as `Platform` says. */
  platform: Platform
  /** The host and system that choose the kept keys and text keys. */
  host: ShortcutHost
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
  /**
   * The origin of the app host, such as `https://app.conductive.build`. An
   * address that people share, such as an invite link, starts with it.
   */
  appOrigin: string
  /** Copies text, such as a command to paste elsewhere. */
  copy: (text: string | Promise<string>) => Promise<void>
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

/** One source shares switch state between the listener and the recorder. */
const windowKeySources = new WeakMap<Window, KeySource>()

function windowKeySource(target: Window): KeySource {
  const existing = windowKeySources.get(target)
  if (existing) return existing
  const switches = new LayoutSwitchKeys()
  const listeners = new Set<(press: KeyPress) => void>()
  let attached = false
  const onKeyDown = (event: KeyboardEvent) => {
    switches.down(event)
    const press: KeyPress = {
      key: event.key,
      code: event.code,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      repeat: event.repeat,
      isComposing: event.isComposing,
      layoutModifiers: switches.modifiers(),
      target: event.target,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
    }
    for (const listener of [...listeners]) listener(press)
  }
  const onKeyUp = (event: KeyboardEvent) => {
    switches.up(event.code)
    detachIfIdle()
  }
  const onBlur = () => {
    switches.clear()
    detachIfIdle()
  }
  function detachIfIdle() {
    if (listeners.size > 0 || switches.modifiers() !== null) return
    target.removeEventListener('keydown', onKeyDown, true)
    target.removeEventListener('keyup', onKeyUp, true)
    target.removeEventListener('blur', onBlur)
    attached = false
  }
  const source: KeySource = Object.assign(
    (listener: (press: KeyPress) => void) => {
      if (!attached) {
        target.addEventListener('keydown', onKeyDown, true)
        target.addEventListener('keyup', onKeyUp, true)
        target.addEventListener('blur', onBlur)
        attached = true
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        detachIfIdle()
      }
    },
    { layoutModifiers: () => switches.modifiers() },
  )
  windowKeySources.set(target, source)
  return source
}

/**
 * Captures window keys before page elements. The source also tracks key-up
 * and blur until each held layout switch clears, even between subscribers.
 */
export function windowKeys(target: Window): AppServices['onKey'] {
  return windowKeySource(target)
}

/** The layout modifiers shared with the window's capture listener. */
export function windowLayoutModifiers(target: Window): LayoutModifiers {
  return windowKeySource(target).layoutModifiers()
}

/** The browsers of Apple: a Mac, and an iPad or an iPhone with a keyboard. */
const appleAgents = /Mac|iPhone|iPad|iPod/

/** The keyboard of a browser window, from the name of its system. */
export function windowPlatform(target: Window): Platform {
  return appleAgents.test(target.navigator.userAgent) ? 'mac' : 'other'
}

/** Only Chrome and Edge in an app display mode count as installed apps. */
export function windowHost(target: Window): ShortcutHost {
  const mode = target.matchMedia?.('(display-mode: window-controls-overlay)')
    .matches
    ? 'window-controls-overlay'
    : target.matchMedia?.('(display-mode: standalone)').matches
      ? 'standalone'
      : 'browser'
  return detectShortcutHost(target.navigator.userAgent, mode)
}
