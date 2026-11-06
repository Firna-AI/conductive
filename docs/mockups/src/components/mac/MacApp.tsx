import { createContext, useContext, type ReactNode } from 'react'

/**
 * How the Mac app shows its window: a normal window with the native
 * window buttons, or full screen, where macOS hides them.
 */
export type WindowMode = 'window' | 'full-screen'

export type MacAppState = {
  mode: WindowMode
  /** A bar at the top of the main area, such as the 15-minute window. */
  banner?: ReactNode
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
