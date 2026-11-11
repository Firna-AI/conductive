import { createContext, useContext, type ReactNode } from 'react'
import { control, touchControl, type ControlSizes } from '../../design/metrics'

const TouchContext = createContext(false)

/** Marks a phone screen: its controls take the touch sizes. */
export function TouchScreen(props: { children: ReactNode }) {
  return <TouchContext.Provider value>{props.children}</TouchContext.Provider>
}

/** True on a phone screen. */
export function useTouch(): boolean {
  return useContext(TouchContext)
}

/** The sizes of the controls: dense on desktop, touch sizes on a phone. */
export function useControlSizes(): ControlSizes {
  return useTouch() ? touchControl : control
}
