import type { Workspace } from '../../shared/generated/Workspace'
import { useRef, useState } from 'react'
import type { QueueMenuAction } from '../../app/merge-queue'
import { classes } from '../../ui/components/common/classes'
import menuStyles from '../../ui/components/common/Menu.module.css'
import type { Submenu } from '../../ui/components/workspaces/workspaceMenu'
import { OwnerChoices, useOwnerChoices } from '../../members/OwnerChoices'
import { nameLabel } from '../../shared/name-label'
import type { Section } from '../../shared/sections'

import { useMembersApi } from '../settings/members-api'
import type { MenuEntry } from '../ui/Menu'
import { MenuList } from '../ui/MenuList'
import { PointMenu, useChoiceFocus } from '../ui/PointMenu'
import { Sheet } from '../ui/Sheet'
import type { MenuOpening } from './row-menu'
import type { RowMenuItem } from './row-queue'

/** What the actions of the menu do to the workspace of the row. */
export interface RowActions {
  move: (workspace: Workspace, sectionId: string) => void
  rename: (workspace: Workspace) => void
  /** Copies the link of the workspace, during the press of its item. */
  copyLink: (workspace: Workspace) => void
  archive: (workspace: Workspace) => void
  /** The owner changed. The workspace is the API's answer. */
  reassigned: (workspace: Workspace) => void
  /** Add to merge queue, or Remove from queue, which asks first. */
  queue: (workspace: Workspace, action: QueueMenuAction) => void
}

type OpenChoices = { id: Submenu; focus: boolean }

/** The sections, with the section of the row checked. */
function sectionEntries(
  sections: readonly Section[],
  current: string | null,
  choose: (sectionId: string) => void,
): MenuEntry[] {
  return [
    { kind: 'label', label: 'Section' },
    ...sections.map((section): MenuEntry => ({
      kind: 'item',
      id: section.id,
      label: section.name,
      checked: section.id === current,
      onSelect: () => choose(section.id),
    })),
  ]
}

/**
 * The open menu of one workspace row, with the actions of `items`: at its
 * point on desktop, with the sections and the members beside it, or in a
 * phone sheet whose choices take the place of the actions. Copy link copies
 * the link of the workspace, and each other action changes the workspace of
 * the row. While a change of the owner runs, the menu refuses to close, so
 * its result or its error shows in it. A change that takes Reassign to away
 * ends that state, and the answer of its change then changes nothing. A
 * render that takes away the item with the focus gives the focus back to
 * the menu, on desktop and in the sheet.
 */
export function RowMenu(props: {
  workspace: Workspace
  /** The section that shows the row. */
  sectionId: string | null
  sections: readonly Section[]
  items: readonly RowMenuItem[]
  opening: MenuOpening
  phone: boolean
  actions: RowActions
  close: () => void
}) {
  const { workspace, actions, phone } = props
  const name = nameLabel(workspace.name)
  const [choices, setChoices] = useState<OpenChoices | null>(null)
  const available = (id: Submenu) =>
    props.items.some((item) => item.kind === 'action' && item.action === id)
  const owner = useOwnerChoices({
    api: useMembersApi(workspace.orgId),
    workspace,
    onReassigned: actions.reassigned,
    close: props.close,
    // The state keeps to Reassign to, as the owner picker of the header keys
    // its state to `canReassign`. A change of the access that takes Reassign
    // to away drops its change and its error. The other actions then work
    // again, and the answer of that change changes nothing.
    scope: `${workspace.orgId}/${workspace.id}/${available('reassign')}`,
  })
  const content = useRef<HTMLDivElement>(null)
  // The sheet gives a focus that a render loses back to its first action.
  // Choices that show in place of the actions take the focus here before
  // that: the checked choice, else the first.
  useChoiceFocus(content, phone && choices !== null)
  // A change of the access can take the action of the open choices away.
  if (choices && !available(choices.id)) setChoices(null)
  const close = () => {
    if (owner.busy) return false
    props.close()
    return true
  }
  const act = (action: () => void) => () => {
    if (!owner.busy) action()
  }
  // While a change of the owner runs, its choices stay, so its result or its
  // error shows in them.
  const showChoices = (id: string | null, focus: boolean) => {
    if (owner.busy) return false
    const next = id === 'move' || id === 'reassign' ? id : null
    if (next === 'reassign' && choices?.id !== 'reassign') owner.open()
    setChoices(next ? { id: next, focus } : null)
    return true
  }
  const entries = props.items.map((item): MenuEntry => {
    if (item.kind === 'divider') return item
    if (item.kind === 'queue') {
      const { label, icon } = item
      const run = () => actions.queue(workspace, item.action)
      return { kind: 'item', label, icon, onSelect: act(run) }
    }
    const { action, label, icon } = item
    if (action === 'move' || action === 'reassign') {
      return { kind: 'submenu', id: action, label, icon }
    }
    // Each other action runs its own callback, so a new action needs one.
    const run = actions[action]
    return { kind: 'item', label, icon, onSelect: act(() => run(workspace)) }
  })
  const placement = phone ? 'sheet' : 'point'
  const shown =
    choices?.id === 'move' ? (
      <MenuList
        close={close}
        entries={sectionEntries(props.sections, props.sectionId, (id) => {
          if (id !== props.sectionId && !owner.busy) actions.move(workspace, id)
        })}
        focus={false}
        label="Section"
        placement={placement}
      />
    ) : choices?.id === 'reassign' ? (
      <OwnerChoices choices={owner} layout={phone ? 'sheet' : 'menu'} />
    ) : null
  if (!phone) {
    return (
      <PointMenu
        anchor={props.opening.anchor}
        back={props.opening.back}
        choices={
          choices && {
            id: choices.id,
            focus: choices.focus,
            content:
              choices.id === 'reassign' ? (
                <div
                  className={classes(
                    menuStyles.menu,
                    menuStyles.point,
                    menuStyles.wide,
                  )}
                >
                  {shown}
                </div>
              ) : (
                shown
              ),
          }
        }
        close={close}
        entries={entries}
        label={name}
        showChoices={showChoices}
      />
    )
  }
  return (
    <Sheet
      close={() => void close()}
      returnFocus={props.opening.back}
      title={name}
    >
      <div ref={content}>
        {shown ?? (
          <MenuList
            close={close}
            entries={entries}
            label={name}
            placement="sheet"
            submenus={{ open: null, show: showChoices }}
          />
        )}
      </div>
    </Sheet>
  )
}
