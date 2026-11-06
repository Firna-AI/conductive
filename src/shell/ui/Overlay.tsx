import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './ui.module.css'

const OverlayContext = createContext<HTMLElement | null>(null)

/**
 * The layer of a frame where dialogs and sheets open. It has no box of its
 * own, so an overlay covers the whole frame, the rail and the sidebar too.
 */
export function OverlayHost(props: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  return (
    <OverlayContext.Provider value={host}>
      {props.children}
      <div className={styles.overlayHost} ref={setHost} />
    </OverlayContext.Provider>
  )
}

/** Puts its content in the overlay layer of the frame. */
export function Overlay(props: { children: ReactNode }) {
  const host = useContext(OverlayContext)
  return host ? createPortal(props.children, host) : null
}

/** Closes an open layer on Escape and on a press outside `inside`. */
export function useDismiss(
  open: boolean,
  inside: RefObject<HTMLElement | null>,
  close: () => void,
): void {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      closeRef.current()
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && inside.current?.contains(target)) return
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, inside])
}

/**
 * Moves the focus into a layer as it opens, and back to the element that
 * had it when the layer closes, unless the user moved it elsewhere.
 */
export function useFocusReturn(layer: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = layer.current
    const before =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const first = node?.querySelector<HTMLElement>(
      '[data-autofocus], [role="menuitem"], [role="menuitemradio"], button, input, textarea, [tabindex="0"]',
    )
    ;(first ?? node)?.focus()
    return () => {
      const active = document.activeElement
      const lost = active === null || active === document.body
      const inLayer = active instanceof Node && node?.contains(active)
      if ((lost || inLayer) && before?.isConnected) before.focus()
    }
  }, [layer])
}
