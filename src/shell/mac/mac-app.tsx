import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { WindowMode } from '../../../docs/mockups/src/components/mac/MacApp'
import { Store, useStore, type Readable } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import mac from './mac.module.css'

export type { WindowMode }

/** What the page of the Mac app knows about its window. */
export interface MacWindowState {
  /** Full screen hides the window buttons of macOS, so the page gets their space back. */
  readonly mode: WindowMode
  /** The history of the window has a page to go back to. */
  readonly canGoBack: boolean
  /** The history of the window has a page to go forward to. */
  readonly canGoForward: boolean
}

/**
 * The window of the Mac app, as its page sees it. The desktop entry makes
 * it from standard browser features, so the page needs no bridge to the
 * Mac app.
 */
export interface MacWindow {
  readonly state: Readable<MacWindowState>
  back(): void
  forward(): void
}

/**
 * The window controls of one run of the Mac app. They sit above every frame
 * of the shell, so the sidebar toggle and the last org stay through a new
 * address, a sign-in, and a load.
 */
export class MacChrome {
  readonly window: MacWindow
  /** The user hid the sidebar with its toggle. */
  readonly sidebarHidden = new Store(false)
  /** The org that the user opened last. The account keeps its sidebar. */
  readonly lastOrg = new Store<string | null>(null)

  constructor(window: MacWindow) {
    this.window = window
  }

  toggleSidebar = (): void => {
    this.sidebarHidden.change((hidden) => !hidden)
  }

  openOrg = (orgId: string): void => {
    this.lastOrg.set(orgId)
  }
}

const MacContext = createContext<MacChrome | null>(null)

/**
 * Marks the shell inside it as the Mac app. The frames then draw the window
 * controls, and the top bars move the window. A browser has no `MacApp`, so
 * it shows none of them.
 */
export function MacApp(props: { window: MacWindow; children: ReactNode }) {
  const [chrome] = useState(() => new MacChrome(props.window))
  return (
    <MacContext.Provider value={chrome}>{props.children}</MacContext.Provider>
  )
}

/** The window controls of the Mac app, or `null` in a browser. */
export function useMacApp(): MacChrome | null {
  return useContext(MacContext)
}

/**
 * The class of a top bar of the main area. In the Mac app the bar moves the
 * window, and its controls do not. When the window controls sit in the top
 * left corner, the bar starts after them.
 */
export function useMacBar(): string | undefined {
  return useMacApp() ? mac.bar : undefined
}

const noOrg: Readable<string | null> = {
  get: () => null,
  subscribe: () => () => undefined,
}

/**
 * The org whose sidebar the account of the Mac app keeps: the org that the
 * user opened last, or else the first org that is not deleted. A browser
 * shows the account without a sidebar.
 */
export function useKeptOrg(
  orgs: readonly OrgSummary[],
): OrgSummary | undefined {
  const chrome = useMacApp()
  const last = useStore(chrome?.lastOrg ?? noOrg)
  if (!chrome) return undefined
  const open = orgs.filter((org) => !org.deletion)
  return open.find((org) => org.id === last) ?? open[0]
}

/** Below this width the sidebar hides, as the container query of `AppFrame.module.css` says. */
const narrowQuery = '(max-width: 899px)'

function subscribeNarrow(listener: () => void): () => void {
  const query = window.matchMedia(narrowQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function narrowNow(): boolean {
  return window.matchMedia(narrowQuery).matches
}

function wide(): boolean {
  return false
}

/**
 * The window is too narrow for the sidebar. The frame of the Mac app fills
 * the window, so the width of the window is the width of the frame.
 */
export function useNarrowWindow(): boolean {
  return useSyncExternalStore(subscribeNarrow, narrowNow, wide)
}
