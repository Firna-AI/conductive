import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent,
} from 'react'
import type { Workspace } from '../../shared/workspaces'
import { DropLayout, type DropTarget } from './drop-target'

export interface RowDragState {
  workspace: Workspace
  from: DropTarget
  target: DropTarget
  /** The pointer, and the place of the pointer in the row, in px. */
  x: number
  y: number
  offsetX: number
  offsetY: number
  width: number
}

interface Press {
  workspace: Workspace
  from: DropTarget
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  touch: boolean
  timer: ReturnType<typeof setTimeout> | null
}

/** A mouse moves this far before a drag starts. A finger holds this long. */
const dragDistance = 4
const scrollDistance = 8
const longPress = 450

/**
 * Drag and drop of workspace rows between sections. A mouse drags after a
 * short move. A finger lifts the row after a long press, and the list does
 * not scroll while the row is lifted.
 */
export function useRowDrag(
  drop: (workspaceId: string, target: DropTarget) => void,
) {
  const [drag, setDrag] = useState<RowDragState | null>(null)
  /** The list gives its sections and rows to the layout through refs. */
  const [layout] = useState(() => new DropLayout())
  const press = useRef<Press | null>(null)
  const dragging = useRef<RowDragState | null>(null)
  const suppressClick = useRef(false)
  const dropRef = useRef(drop)
  const end = useRef<(commit: boolean) => void>(() => undefined)
  const start = useRef<(press: Press) => void>(() => undefined)
  useEffect(() => {
    dropRef.current = drop
  })

  useEffect(() => {
    const show = (state: RowDragState | null) => {
      dragging.current = state
      setDrag(state)
    }
    const begin = (current: Press, x: number, y: number) => {
      if (current.timer) clearTimeout(current.timer)
      current.timer = null
      if (current.touch) navigator.vibrate?.(10)
      show({
        workspace: current.workspace,
        from: current.from,
        target: current.from,
        x,
        y,
        offsetX: current.offsetX,
        offsetY: current.offsetY,
        width: current.width,
      })
    }
    const onMove = (event: globalThis.PointerEvent) => {
      const current = press.current
      if (!current) return
      const moved = Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY,
      )
      if (!dragging.current) {
        if (current.touch && moved > scrollDistance) end.current(false)
        else if (!current.touch && moved > dragDistance)
          begin(current, event.clientX, event.clientY)
        return
      }
      const target = layout.targetAt(current.workspace.id, event.clientY)
      show({
        ...dragging.current,
        target: target ?? dragging.current.target,
        x: event.clientX,
        y: event.clientY,
      })
    }
    const onTouchMove = (event: TouchEvent) => {
      if (dragging.current) event.preventDefault()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && press.current) end.current(false)
    }
    const stop = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('touchmove', onTouchMove)
    }
    const onUp = () => end.current(true)
    const onCancel = () => end.current(false)
    end.current = (commit) => {
      const current = press.current
      const state = dragging.current
      if (current?.timer) clearTimeout(current.timer)
      press.current = null
      stop()
      show(null)
      if (!state) return
      // The click that ends a drag opens no workspace.
      suppressClick.current = true
      setTimeout(() => {
        suppressClick.current = false
      }, 0)
      const { target, from } = state
      const same =
        target.sectionId === from.sectionId && target.index === from.index
      if (commit && !same) dropRef.current(state.workspace.id, target)
    }
    start.current = (next: Press) => {
      press.current = next
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      window.addEventListener('keydown', onKey)
      document.addEventListener('touchmove', onTouchMove, { passive: false })
      if (next.touch) {
        next.timer = setTimeout(
          () => begin(next, next.startX, next.startY),
          longPress,
        )
      }
    }
    return () => end.current(false)
  }, [layout])

  const bind = (
    workspace: Workspace,
    from: DropTarget,
  ): HTMLAttributes<HTMLElement> => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || press.current) return
      const box = event.currentTarget.getBoundingClientRect()
      start.current({
        workspace,
        from,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - box.left,
        offsetY: event.clientY - box.top,
        width: box.width,
        touch: event.pointerType === 'touch',
        timer: null,
      })
    },
    onClickCapture: (event) => {
      if (!suppressClick.current) return
      event.preventDefault()
      event.stopPropagation()
    },
    onContextMenu: (event) => {
      if (press.current?.touch) event.preventDefault()
    },
    onDragStart: (event) => event.preventDefault(),
  })

  return { drag, bind, layout }
}
