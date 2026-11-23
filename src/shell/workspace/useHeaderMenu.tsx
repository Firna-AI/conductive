import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useListTime } from '../../app/deadlines'
import { groupWorkspaces } from '../../app/sections'
import { useStore, valueOf } from '../../app/store'

import { useOrgAccess, useOrgModel } from '../context'
import { belowRow, type RowMenu } from '../list/row-menu'
import { useListActions } from '../list/useListActions'
import { useListQueue } from '../list/useListQueue'
import { useRowMenus } from '../list/useRowMenus'
import { useQueueKnown } from './github/workspace-queue'
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
 * section and the tree of the workspace, and for the list to show it.
 * Otherwise `toggle` is null and the name is plain text.
 */
export function useHeaderMenu(context: WorkspaceContext): {
  /** Opens the menu below the name, or closes it. Null without a menu. */
  toggle: (() => void) | null
  /** Takes the element of the name button, also after Rename replaced it. */
  buttonRef: (node: unknown) => void
  /** Notes a pointer press on the name, before its click. */
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
  // The list leaves out an archived workspace after its Restore ends, so the
  // header offers its menu only while the list shows it.
  const listTime = useListTime(valueOf(workspaces) ?? [])
  const groups =
    sections.state === 'ready' && workspaces.state === 'ready'
      ? groupWorkspaces(sections.value, workspaces.value, listTime)
      : { sections: [], queued: [], archived: [] }
  const queue = useListQueue(model, valueOf(workspaces) ?? [], groups.queued)
  const known = useQueueKnown(workspace.id)
  const { menus, layer } = useRowMenus({
    orgId: org.id,
    viewer,
    groups: groups.sections,
    queued: groups.queued,
    archived: groups.archived,
    readOnly: suspended,
    move,
    queue: { ...queue.rows, known },
  })
  const listed = [
    ...groups.sections.flatMap((group) =>
      group.rows.map((row) => row.workspace),
    ),
    ...groups.queued,
    ...groups.archived,
  ].find((item) => item.id === workspace.id)
  const menu = listed ? menus(listed) : undefined
  const rename = menu?.rename ?? null
  // The current name button, which places the menu and takes the focus back.
  // Rename replaces the button, so the ref follows the new one.
  const name = useRef<HTMLElement | null>(null)
  const buttonRef = (node: unknown) => {
    name.current = node instanceof HTMLElement ? node : null
  }
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
  // The menu was open as a pointer press on the name started. That press
  // closed it, as a press outside the menu, so its click opens nothing. The
  // note lasts for that one press: it ends after the release of the pointer,
  // also when no click follows, as after a right click.
  const openAtPress = useRef(false)
  const pressStart = () => {
    openAtPress.current = menu?.open ?? false
    const end = () => {
      document.removeEventListener('pointerup', end, true)
      document.removeEventListener('pointercancel', end, true)
      // The click of the press comes in the same task as its release.
      setTimeout(() => {
        openAtPress.current = false
      })
    }
    document.addEventListener('pointerup', end, true)
    document.addEventListener('pointercancel', end, true)
  }
  const toggle = () => {
    const closing = openAtPress.current
    openAtPress.current = false
    const button = name.current
    if (!menu || menu.open || closing || !button) return
    const box = button.getBoundingClientRect()
    menu.show({
      anchor: { x: box.left, y: box.bottom + belowRow },
      back: () => focusBack(name.current),
    })
  }
  return {
    toggle: menu ? toggle : null,
    buttonRef,
    pressStart,
    open: menu?.open ?? false,
    rename,
    layer,
  }
}
