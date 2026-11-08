import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from './layers'
import styles from './ui.module.css'

/** The elements of a layer that can take the focus, links first among equals. */
export const focusableSelector =
  'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'

interface OverlayLayer {
  host: HTMLElement | null
  /**
   * Makes the content of the frame inert while a sheet or a dialog shows.
   * The result ends the hold. The content stays inert until the last hold
   * ends.
   */
  holdModal: () => () => void
}

const OverlayContext = createContext<OverlayLayer>({
  host: null,
  holdModal: () => () => undefined,
})

/**
 * The layer of a frame where dialogs and sheets open. It has no box of its
 * own, so an overlay covers the whole frame, the rail and the sidebar too.
 * The content of the frame sits in a wrapper without a box, which a sheet
 * or a dialog makes inert, so that the keyboard reaches only the layer.
 */
export function OverlayHost(props: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const holds = useRef(0)
  const holdModal = useCallback(() => {
    holds.current += 1
    if (content.current) content.current.inert = true
    let held = true
    return () => {
      if (!held) return
      held = false
      holds.current -= 1
      if (holds.current === 0 && content.current) content.current.inert = false
    }
  }, [])
  const layer = useMemo(() => ({ host, holdModal }), [host, holdModal])
  return (
    <OverlayContext.Provider value={layer}>
      <div className={styles.overlayContent} ref={content}>
        {props.children}
      </div>
      <div className={styles.overlayHost} ref={setHost} />
    </OverlayContext.Provider>
  )
}

/** Puts its content in the overlay layer of the frame. */
export function Overlay(props: { children: ReactNode }) {
  const { host } = useContext(OverlayContext)
  return host ? createPortal(props.children, host) : null
}

/** Closes an open layer on a press outside `inside`. */
export function usePressOutside(
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
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && inside.current?.contains(target)) return
      closeRef.current()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, inside])
}

/**
 * Closes an open layer on Escape and on a press outside `inside`. Escape
 * counts in the capture phase, because a text field stops its key events.
 */
export function useDismiss(
  open: boolean,
  inside: RefObject<HTMLElement | null>,
  close: () => void,
): void {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  usePressOutside(open, inside, close)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])
}

/**
 * Moves the focus into a layer as it opens: to its element with
 * `data-autofocus`, else to the first one that can take the focus. When
 * the layer closes, the focus goes back to the element that had it, unless
 * the user moved it elsewhere. A modal layer, a sheet or a dialog, makes
 * the content of the frame inert while it shows, and active again before
 * the focus goes back. A layer inside another, such as a menu in a sheet,
 * leaves the focus to the outer layer with `enabled: false`. A modal layer
 * also counts as an open dialog for the command palette, whose key then
 * does nothing.
 */
export function useLayerFocus(
  layer: RefObject<HTMLElement | null>,
  options: { modal: boolean; enabled?: boolean },
): void {
  const { holdModal } = useContext(OverlayContext)
  const enabled = options.enabled ?? true
  const { modal } = options
  useModalLayer(enabled && modal)
  useEffect(() => {
    if (!enabled) return
    const node = layer.current
    const before =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const release = modal ? holdModal() : null
    const first =
      node?.querySelector<HTMLElement>('[data-autofocus]') ??
      node?.querySelector<HTMLElement>(focusableSelector)
    ;(first ?? node)?.focus()
    return () => {
      release?.()
      const active = document.activeElement
      const lost = active === null || active === document.body
      const inLayer = active instanceof Node && node?.contains(active)
      if ((lost || inLayer) && before?.isConnected) before.focus()
    }
  }, [layer, enabled, modal, holdModal])
}
