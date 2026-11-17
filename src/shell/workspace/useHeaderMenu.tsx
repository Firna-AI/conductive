import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { groupWorkspaces } from '../../app/sections'
import { useStore } from '../../app/store'

import { useOrgAccess, useOrgModel } from '../context'
import type { RowMenu } from '../list/row-menu'
import { useListActions } from '../list/useListActions'
import { useRowMenus } from '../list/useRowMenus'
import type { WorkspaceContext } from './features'

/**
 * The parts of the header that keep their own press: links, buttons, fields,
 * menus, and other controls. A right click on one of them opens no menu of
 * the workspace.
 */
const controls = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'label',
  '[contenteditable]',
  '[role="button"]',
  '[role="link"]',
  '[role="menu"]',
  '[role^="menuitem"]',
  '[role="combobox"]',
  '[role="tab"]',
  '[tabindex]',
].join(', ')

/**
 * The press hit a control inside `bar`. An element around the bar, such as
 * a main area that holds the focus with its `tabindex`, is no control of it.
 */
function onControl(target: EventTarget, bar: Element): boolean {
  if (!(target instanceof Element)) return false
  const control = target.closest(controls)
  return control !== null && control !== bar && bar.contains(control)
}

/** Gives the focus back to `node`, when the page still shows it. */
function focusBack(node: HTMLElement | null): void {
  if (node?.isConnected) node.focus()
}

/**
 * The workspace menu of the open workspace in its header: the same menu, the
 * same actions, and the same rules as the menu of its row in the list. A
 * right click on the bar, but not on one of its controls, opens it at the
 * pointer, or as a sheet on a phone. As it closes, the focus goes back to
 * the element that had it, and so does a close of the field of Rename that
 * drops the focus. `rename` is the field of Rename while it is open, which
 * the header shows in place of the name. The menu waits for the list
 * of the org, which gives the section and the tree of the workspace. Until
 * then, a right click opens the menu of the browser.
 */
export function useHeaderMenu(context: WorkspaceContext): {
  onContextMenu: (event: MouseEvent<HTMLElement>) => void
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
  // The element that had the focus as the menu opened.
  const before = useRef<HTMLElement | null>(null)
  const renaming = rename !== null
  const wasRenaming = useRef(false)
  useLayoutEffect(() => {
    const closed = wasRenaming.current && !renaming
    wasRenaming.current = renaming
    const active = document.activeElement
    if (closed && (active === null || active === document.body)) {
      focusBack(before.current)
    }
  }, [renaming])
  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (
      !menu ||
      event.defaultPrevented ||
      onControl(event.target, event.currentTarget)
    )
      return
    event.preventDefault()
    if (menu.open) return
    const active = document.activeElement
    before.current =
      active instanceof HTMLElement && active !== document.body ? active : null
    menu.show({
      anchor: { x: event.clientX, y: event.clientY },
      back: () => focusBack(before.current),
    })
  }
  return { onContextMenu, rename, layer }
}
