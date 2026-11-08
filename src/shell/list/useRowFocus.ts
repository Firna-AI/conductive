import { useLayoutEffect, useRef, useState, type FocusEvent } from 'react'

/** The link of a row that has the focus, and the workspace of the row. */
interface FocusedRow {
  workspaceId: string
  link: HTMLAnchorElement
}

/**
 * Keeps the focus on a workspace row when a render of the list replaces
 * the link of the row, as a move by keys to another section does: the new
 * link of the same workspace takes the focus. As `useLayerFocus` does, it
 * gives back only a lost focus: the old link left the page, and the focus
 * fell to the page itself. When the user moves the focus away, the row
 * lets it go, so a later read of the list leaves the focus where it is.
 * A move inside a section keeps the link, and React keeps its focus.
 */
export function useRowFocus() {
  const [links] = useState(() => new Map<string, HTMLAnchorElement>())
  const focused = useRef<FocusedRow | null>(null)
  useLayoutEffect(() => {
    const row = focused.current
    if (!row || row.link.isConnected) return
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
    /** The link of a row takes the focus. */
    focus: (workspaceId: string, event: FocusEvent<HTMLAnchorElement>) => {
      focused.current = { workspaceId, link: event.currentTarget }
    },
    /**
     * The link of a row loses the focus. A browser can also blur a link
     * while a render takes it out, before the check after the render. So
     * the row lets the focus go after that check, unless the focus came
     * back to the row.
     */
    blur: (event: FocusEvent<HTMLAnchorElement>) => {
      const row = focused.current
      if (row?.link !== event.currentTarget) return
      queueMicrotask(() => {
        if (focused.current !== row) return
        if (document.activeElement !== row.link) focused.current = null
      })
    },
  }
}
