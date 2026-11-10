import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { parseRoute, type Route } from './router'

/** The address bar of the app. Tests use a memory one. */
export interface Navigation {
  /** The path and the query of the current address. */
  href(): string
  push(to: string): void
  replace(to: string): void
  subscribe(listener: () => void): () => void
}

export function browserNavigation(target: Window): Navigation {
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of [...listeners]) listener()
  }
  target.addEventListener('popstate', notify)
  const go = (to: string, replace: boolean) => {
    if (replace) target.history.replaceState(null, '', to)
    else target.history.pushState(null, '', to)
    target.scrollTo(0, 0)
    notify()
  }
  return {
    href: () => `${target.location.pathname}${target.location.search}`,
    push: (to) => go(to, false),
    replace: (to) => go(to, true),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function memoryNavigation(initial: string): Navigation & {
  readonly history: string[]
} {
  const history = [initial]
  const listeners = new Set<() => void>()
  const go = (to: string, replace: boolean) => {
    if (replace) history[history.length - 1] = to
    else history.push(to)
    for (const listener of [...listeners]) listener()
  }
  return {
    history,
    href: () => history[history.length - 1],
    push: (to) => go(to, false),
    replace: (to) => go(to, true),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const NavigationContext = createContext<Navigation | null>(null)

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error('The app has no navigation.')
  return navigation
}

export function useHref(): string {
  const navigation = useNavigation()
  return useSyncExternalStore(
    navigation.subscribe,
    navigation.href,
    navigation.href,
  )
}

/** The screen of an address of the app. */
export function routeOf(href: string): Route {
  const url = new URL(href, 'https://app.invalid')
  return parseRoute(url.pathname, url.search)
}

/** The screen of the current address. */
export function useRoute(): Route {
  const href = useHref()
  return useMemo(() => routeOf(href), [href])
}
