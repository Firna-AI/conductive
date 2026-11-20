import {
  createContext,
  useContext,
  useEffect,
  useState,
  type RefObject,
} from 'react'

/**
 * How near the view an element comes before it counts as near: 400 CSS px
 * above or below the part of the chat that shows. That is more than the
 * 240 px of a loading picture, so a picture often comes before it scrolls
 * into view, and less than a screen, so a long chat reads only the
 * pictures near the reader.
 */
const NEAR_MARGIN = '400px 0px'

/**
 * The scroll box of the chat, which `ChatPane` gives. The margin of the
 * view applies to the edges of this box, because a scroll box clips each
 * element in it at its own edges. Outside a chat, the margin applies to the
 * window.
 */
export const NearViewRoot = createContext<RefObject<HTMLElement | null> | null>(
  null,
)

/**
 * Whether the element of `ref` came near the view of the chat, once. While
 * `watch` is false, nothing watches the element. Once the element comes
 * near, the value stays true, and nothing watches it anymore. A browser
 * without `IntersectionObserver` counts each watched element as near.
 */
export function useNearView(
  ref: RefObject<Element | null>,
  watch: boolean,
): boolean {
  const root = useContext(NearViewRoot)
  const [near, setNear] = useState(false)
  const watches = typeof IntersectionObserver === 'function'
  useEffect(() => {
    const element = ref.current
    if (!watch || near || !watches || !element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true)
      },
      { root: root?.current ?? null, rootMargin: NEAR_MARGIN },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, root, watch, near, watches])
  return near || (watch && !watches)
}
