import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { groupWorkspaces } from '../../app/sections'
import { useStore } from '../../app/store'

import { useOrgAccess, useOrgModel } from '../context'
import { belowRow, type RowMenu } from '../list/row-menu'
import { useListActions } from '../list/useListActions'
import { useRowMenus } from '../list/useRowMenus'
import type { WorkspaceContext } from './features'

/** Gives the focus back to `node`, when the page still shows it. */
function focusBack(node: HTMLElement | null): void {
  if (node?.isConnected) node.focus()
}

/**
 * The workspace menu of the open workspace in its header: the same menu, the
 * same actions, and the same rules as the menu of its row in the list. A
 * press on the name opens it below the name, or as a sheet on a phone, and
 * a second press closes it. As it closes, the focus goes back to the name,
 * and so does a close of the field of Rename that drops the focus. `rename`
 * is the field of Rename while it is open, which the header shows in place
 * of the name. The menu waits for the list of the org, which gives the
 * section and the tree of the workspace. Until then, `toggle` is null and
 * the name is plain text.
 */
export function useHeaderMenu(context: WorkspaceContext): {
  /** Opens the menu below `button`, the name, or closes it. */
  toggle: ((button: HTMLElement) => void) | null
  /** Notes a press on the name, before the menu closes at a press outside. */
  pressStart: () => void
  open: boolean
  rename: RowMenu['rename']
  layer: ReactNode
} {
  const { org, workspace, viewer } = context
  const model = useOrgModel(org.id)
  const { suspended } = useOrgAccess(org)
  const sections = useStore(model.sections)
  const workspaces = useStore(model.workspaces)
  const { move } = useListActions(model)
  useEffect(() => model.watch('list'), [model])
  const groups =
    sections.state === 'ready' && workspaces.state === 'ready'
      ? groupWorkspaces(sections.value, workspaces.value)
      : { sections: [], archived: [] }
  const { menus, layer } = useRowMenus({
    orgId: org.id,
    viewer,
    groups: groups.sections,
    archived: groups.archived,
    readOnly: suspended,
    move,
  })
  const listed = [
    ...groups.sections.flatMap((group) =>
      group.rows.map((row) => row.workspace),
    ),
    ...groups.archived,
  ].find((item) => item.id === workspace.id)
  const menu = listed ? menus(listed) : undefined
  const rename = menu?.rename ?? null
  // The name that opened the menu, which takes the focus back.
  const name = useRef<HTMLElement | null>(null)
  const renaming = rename !== null
  const wasRenaming = useRef(false)
  useLayoutEffect(() => {
    const closed = wasRenaming.current && !renaming
    wasRenaming.current = renaming
    const active = document.activeElement
    if (closed && (active === null || active === document.body)) {
      focusBack(name.current)
    }
  }, [renaming])
  // The menu was open as the press on the name started. That press closed
  // it, as a press outside the menu, and its click opens nothing.
  const openAtPress = useRef(false)
  const pressStart = () => {
    openAtPress.current = menu?.open ?? false
  }
  const toggle = (button: HTMLElement) => {
    const closing = openAtPress.current
    openAtPress.current = false
    if (!menu || menu.open || closing) return
    name.current = button
    const box = button.getBoundingClientRect()
    menu.show({
      anchor: { x: box.left, y: box.bottom + belowRow },
      back: () => focusBack(name.current),
    })
  }
  return {
    toggle: menu ? toggle : null,
    pressStart,
    open: menu?.open ?? false,
    rename,
    layer,
  }
}
