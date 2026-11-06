import { createContext, useContext, type ReactNode } from 'react'
import {
  control,
  touchControl,
  type ControlSizes,
} from '../../../docs/mockups/src/design/metrics'
import type { FilesLayout } from '../navigation'
import { classes } from './classes'
import styles from './layout.module.css'

const LayoutContext = createContext<FilesLayout>('desktop')

/**
 * Gives the parts inside it the layout. On a phone the controls take the
 * touch sizes, and the local rows and buttons are at least 44 px high.
 */
export function LayoutRoot(props: {
  layout: FilesLayout
  className: string
  /** Names the root as a section, as for the page of one file. */
  label?: string
  children: ReactNode
}) {
  const className = classes(
    props.className,
    props.layout === 'phone' && styles.phone,
  )
  return (
    <LayoutContext value={props.layout}>
      {props.label ? (
        <section aria-label={props.label} className={className}>
          {props.children}
        </section>
      ) : (
        <div className={className}>{props.children}</div>
      )}
    </LayoutContext>
  )
}

/** The sizes of the Firna controls: dense on desktop, touch sizes on a phone. */
export function useControlSizes(): ControlSizes {
  return useContext(LayoutContext) === 'phone' ? touchControl : control
}

/** The class that shows the keyboard focus of a local link or button. */
export const focusClass = styles.focus
