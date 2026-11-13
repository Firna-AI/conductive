import { createContext, useContext, type ReactNode } from 'react'

/**
 * How the Mac app shows its window: a normal window with the native
 * window buttons, or full screen, where macOS hides them.
 */
export type WindowMode = 'window' | 'full-screen'

/**
 * The result of the last change of the Mac's settings: Remove of the
 * always-allowed `npm run lint`, Stop of the grant of the workspace, or Keep
 * of its 15 minutes until the user stops. The Mac made and saved it, made
 * it but did not save it, or did not make it.
 */
export type MacChange =
  | 'removed'
  | 'remove-not-saved'
  | 'remove-failed'
  | 'stopped'
  | 'stop-not-saved'
  | 'stop-failed'
  | 'keep-failed'

export type MacAppState = {
  mode: WindowMode
  /** A bar at the top of the main area, such as the 15-minute window. */
  banner?: ReactNode
  /** The other ways to allow a waiting command are drawn open. */
  choicesOpen?: boolean
  /** The result of the last change of the Mac's settings. */
  change?: MacChange
  /** The workspace whose agent waits for the user, which the list marks. */
  needsInput?: string
}

const MacAppContext = createContext<MacAppState | undefined>(undefined)

/**
 * Marks the screens inside it as the Mac app (decision 62). The app frame
 * then draws the window controls at the top of its left panel.
 */
export function MacApp(props: MacAppState & { children: ReactNode }) {
  const { children, ...state } = props
  return (
    <MacAppContext.Provider value={state}>{children}</MacAppContext.Provider>
  )
}

/** The window of the Mac app, or none in a browser. */
export function useMacApp(): MacAppState | undefined {
  return useContext(MacAppContext)
}
