import { useLayoutEffect, useRef, useState, type FocusEvent } from 'react'

/** The row that contains the focus, and its workspace. */
interface FocusedRow {
  workspaceId: string
  surface: HTMLElement
}

/**
 * Keeps the focus on a workspace row when a render of the list replaces
 * the row, as a move by keys to another section does: the new
 * link of the same workspace takes the focus. As `useLayerFocus` does, it
 * gives back only a lost focus: the old row left the page, and the focus
 * fell to the page itself. When the user moves the focus away, the row
 * lets it go, so a later read of the list leaves the focus where it is.
 * A move inside a section keeps its controls, and React keeps the focus.
 */
export function useRowFocus() {
  const [links] = useState(() => new Map<string, HTMLAnchorElement>())
  const focused = useRef<FocusedRow | null>(null)
  useLayoutEffect(() => {
    const row = focused.current
    if (!row || row.surface.isConnected) return
    const active = document.activeElement
    if (active !== null && active !== document.body) return
    const next = links.get(row.workspaceId)
    if (next?.isConnected) next.focus()
    else focused.current = null
  })
  return {
    /** The ref of the link of a row. */
    linkRef: (workspaceId: string) => (node: HTMLAnchorElement | null) => {
      if (node) links.set(workspaceId, node)
      else if (links.get(workspaceId)?.isConnected === false) {
        links.delete(workspaceId)
      }
    },
    /**
     * Gives the focus to the current link of the row of a workspace, also
     * after a render replaced the row, as a move to another section does.
     * It says whether the row has such a link.
     */
    focusLink: (workspaceId: string): boolean => {
      const link = links.get(workspaceId)
      if (!link?.isConnected) return false
      link.focus()
      return true
    },
    /** A control in the row takes the focus. */
    focus: (workspaceId: string, event: FocusEvent<HTMLElement>) => {
      focused.current = { workspaceId, surface: event.currentTarget }
    },
    /**
     * A control of a row loses the focus. A browser can also blur a control
     * while a render takes it out, before the check after the render. So
     * the row lets the focus go after that check, unless the focus came
     * back to the row.
     */
    blur: (event: FocusEvent<HTMLElement>) => {
      const row = focused.current
      if (row?.surface !== event.currentTarget) return
      queueMicrotask(() => {
        if (focused.current !== row) return
        if (!row.surface.contains(document.activeElement))
          focused.current = null
      })
    },
  }
}
