import { createContext, useContext, type ReactNode } from 'react'
import {
  control,
  touchControl,
  type ControlSizes,
} from '../../../docs/mockups/src/design/metrics'
import styles from './ToolRoot.module.css'

const TouchContext = createContext(false)

/**
 * The root of a tool. It fills the panel or the phone page that holds it. On
 * a phone, `touch` makes every control of the tool at least 44px high.
 */
export function ToolRoot(props: { touch: boolean; children: ReactNode }) {
  return (
    <TouchContext.Provider value={props.touch}>
      <div
        className={props.touch ? `${styles.root} ${styles.touch}` : styles.root}
      >
        {props.children}
      </div>
    </TouchContext.Provider>
  )
}

/** True inside a tool on a phone. */
export function useTouch(): boolean {
  return useContext(TouchContext)
}

/** The sizes of the controls: dense on desktop, touch sizes on a phone. */
export function useControlSizes(): ControlSizes {
  return useTouch() ? touchControl : control
}
