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

/** The open layers that Escape can close, the newest last. */
const escapeLayers: object[] = []

/**
 * Closes an open layer on Escape and on a press outside `inside`. Escape
 * counts in the capture phase, because a text field stops its key events.
 * Escape closes only the newest open layer, such as a menu in a dialog.
 * With `modal`, a press outside does not move the focus, which a browser
 * does at each press, so the focus goes back to the trigger of the layer.
 */
export function useDismiss(
  open: boolean,
  inside: RefObject<HTMLElement | null>,
  close: () => void,
  options: { modal?: boolean } = {},
): void {
  const modal = options.modal ?? false
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!open) return
    const layer = {}
    escapeLayers.push(layer)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || escapeLayers.at(-1) !== layer) return
      event.stopPropagation()
      closeRef.current()
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && inside.current?.contains(target)) return
      if (modal) event.preventDefault()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      escapeLayers.splice(escapeLayers.indexOf(layer), 1)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, inside, modal])
}

/** Something that takes the focus, such as the handle of a Firna field. */
export interface Focusable {
  focus(): void
}

/**
 * Moves the focus into a layer as it opens: to `initial`, else to its
 * element with `data-autofocus`, else to the first one that can take the
 * focus. When the layer closes, the focus goes back to the element that
 * had it, unless the user moved it elsewhere, or `giveBack` says no, such
 * as when another screen opened. A modal layer, a sheet or a dialog, makes
 * the content of the frame inert while it shows, and active again before
 * the focus goes back. A layer inside another, such as a menu in a sheet,
 * leaves the focus to the outer layer with `enabled: false`.
 */
export function useLayerFocus(
  layer: RefObject<HTMLElement | null>,
  options: {
    modal: boolean
    enabled?: boolean
    /** The part that takes the focus as the layer opens. */
    initial?: RefObject<Focusable | null>
    /** Whether the focus goes back as the layer closes. It reads the close. */
    giveBack?: () => boolean
  },
): void {
  const { holdModal } = useContext(OverlayContext)
  const enabled = options.enabled ?? true
  const { modal, initial } = options
  const giveBack = useRef(options.giveBack)
  useEffect(() => {
    giveBack.current = options.giveBack
  })
  useEffect(() => {
    if (!enabled) return
    const node = layer.current
    const before =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const release = modal ? holdModal() : null
    const first =
      initial?.current ??
      node?.querySelector<HTMLElement>('[data-autofocus]') ??
      node?.querySelector<HTMLElement>(focusableSelector)
    ;(first ?? node)?.focus()
    return () => {
      release?.()
      if (giveBack.current?.() === false) return
      const active = document.activeElement
      const lost = active === null || active === document.body
      const inLayer = active instanceof Node && node?.contains(active)
      if ((lost || inLayer) && before?.isConnected) before.focus()
    }
  }, [layer, enabled, modal, initial, holdModal])
}

/**
 * A modal layer, a sheet or a dialog. Escape and a press outside close it.
 * The focus moves into it as it opens, as `useLayerFocus` says, and the
 * rest of the frame is inert while it shows. A press outside does not move
 * the focus, so the focus goes back to the trigger as the layer closes.
 */
export function useModalLayer(
  layer: RefObject<HTMLElement | null>,
  close: () => void,
  focus: {
    initial?: RefObject<Focusable | null>
    giveBack?: () => boolean
  } = {},
): void {
  useDismiss(true, layer, close, { modal: true })
  useLayerFocus(layer, { ...focus, modal: true })
}
