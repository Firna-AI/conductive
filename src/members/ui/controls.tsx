import { createContext, useContext, type ReactNode } from 'react'
import styles from './controls.module.css'

/** The layout that a screen draws: a desktop window or a phone. */
export type Viewport = 'desktop' | 'mobile'

/** The sizes of the Firna controls in one layout. */
export type ControlSizes = {
  /** The height of a button, in px. */
  height: number
  labelSize: number
  labelWeight: 500
  /** The Firna size of an input. */
  field: 'sm' | 'lg'
}

/**
 * The dense controls of the desktop layout. The values follow the control
 * tokens of the design in `docs/mockups/src/design/metrics.ts`.
 */
const denseControls: ControlSizes = {
  height: 26,
  labelSize: 12,
  labelWeight: 500,
  field: 'sm',
}

/** On a phone every control is at least 40 px high, so a finger can hit it. */
const touchControls: ControlSizes = {
  height: 40,
  labelSize: 14,
  labelWeight: 500,
  field: 'lg',
}

const ViewportContext = createContext<Viewport>('desktop')

/**
 * Gives the controls inside it the sizes of one layout. On a phone it also
 * sets `--ui-touch-min`, which the local controls read. Its element takes
 * no box (`display: contents`), so the parent lays out the children.
 */
export function ViewportScope(props: {
  viewport: Viewport
  /** Use a `span`, for a scope inside a line of content. */
  inline?: boolean
  children: ReactNode
}) {
  const className =
    props.viewport === 'mobile'
      ? `${styles.scope} ${styles.touch}`
      : styles.scope
  return (
    <ViewportContext.Provider value={props.viewport}>
      {props.inline ? (
        <span className={className}>{props.children}</span>
      ) : (
        <div className={className}>{props.children}</div>
      )}
    </ViewportContext.Provider>
  )
}

/** The layout of the nearest `ViewportScope`. */
export function useViewport(): Viewport {
  return useContext(ViewportContext)
}

/** The control sizes of the nearest `ViewportScope`. */
export function useControlSizes(): ControlSizes {
  return useViewport() === 'mobile' ? touchControls : denseControls
}
