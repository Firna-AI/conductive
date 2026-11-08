import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { TouchScreen } from '../../../docs/mockups/src/components/common/touch'

/**
 * The two layouts of the mockups: the desktop app, which narrows with the
 * window and hides its sidebar below 900 px, and the phone, with touch
 * targets of at least 44 px.
 */
export type Viewport = 'desktop' | 'phone'

/** A window narrower than this shows the phone layout. */
const phoneQuery = '(max-width: 639px)'

const ViewportContext = createContext<Viewport | null>(null)

function subscribe(listener: () => void): () => void {
  const query = window.matchMedia(phoneQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function snapshot(): Viewport {
  return window.matchMedia(phoneQuery).matches ? 'phone' : 'desktop'
}

function serverSnapshot(): Viewport {
  return 'desktop'
}

const noSubscription = () => () => undefined

function useWindowViewport(enabled: boolean): Viewport {
  return useSyncExternalStore(
    enabled ? subscribe : noSubscription,
    enabled ? snapshot : serverSnapshot,
    serverSnapshot,
  )
}

/** The layout of the window, or the one that a test or a frame sets. */
export function useViewport(): Viewport {
  const fixed = useContext(ViewportContext)
  const measured = useWindowViewport(fixed === null)
  return fixed ?? measured
}

/**
 * Sets the layout of its content. The phone layout also gives every Firna
 * control its touch size.
 */
export function ViewportProvider(props: {
  viewport: Viewport
  children: ReactNode
}) {
  const content =
    props.viewport === 'phone' ? (
      <TouchScreen>{props.children}</TouchScreen>
    ) : (
      props.children
    )
  return (
    <ViewportContext.Provider value={props.viewport}>
      {content}
    </ViewportContext.Provider>
  )
}
