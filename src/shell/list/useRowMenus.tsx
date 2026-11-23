import type { Workspace } from '../../shared/generated/Workspace'
import { useState, type ReactNode } from 'react'
import { useToast } from '@firna/ui/toast'
import { workspaceMenuItems } from '../../ui/components/workspaces/workspaceMenu'
import { linkResults } from '../../ui/components/workspace/linkCopy'
import { errorMessage } from '../../app/api/client'
import type { ArchiveAction } from '../../app/archive-model'
import { usePassedDeadlines } from '../../app/deadlines'
import type { QueueFacts } from '../../app/merge-queue'
import { queueMenuAction } from '../../app/merge-queue-join'
import { mayArchive, mayRestore } from '../../app/permissions'
import type { SectionGroup } from '../../app/sections'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'

import { useApp, useOrgModel } from '../context'
import { useViewport } from '../ui/viewport'
import { shownWorkspaces } from '../workspace/tab-memory'
import { useArchiveActions } from '../workspace/useArchiveActions'
import type { DropTarget } from './drop-target'
import { RemoveQueueDialog } from './RemoveQueueDialog'
import type { MenuOpening, RowMenus } from './row-menu'
import { removeQuestionOf, withQueueItem, type RowMenuItem } from './row-queue'
import { RowMenu, type RowActions } from './RowMenu'

type OpenMenu = MenuOpening & { workspaceId: string }

/** The action of a row that runs at once, or none for the person. */
type RowAction = (workspace: Workspace) => (() => void) | undefined

const renames = (items: readonly RowMenuItem[]) =>
  items.some((item) => item.kind === 'action' && item.action === 'rename')

/**
 * The merge queue of the rows of a list: what the list knows of the
 * queues, and the writes that the queue item of a menu runs. `known` gives
 * what the screen of a workspace knows for the question of Remove from
 * queue, such as the number of its pull request.
 */
export interface RowQueue {
  facts: QueueFacts
  add: (workspaceId: string) => void
  remove: (workspaceId: string) => void
  known?: (workspaceId: string) => { number?: number }
}

/**
 * The menus of the rows of a list, their Rename field, which a double click
 * on a row also opens, the Archive shortcut of each row, and the Restore
 * shortcut of each archived row. Each row gets only the actions that the
 * person can use. Every row offers Copy link, also an archived row and a
 * row of a read-only list, and a toast gives the result of its copy. A
 * nested row offers no Move to section, because it moves with its tree. A
 * change of the role, the workspace, or the org drops an action that it
 * takes away. The shortcut and Archive in the menu run the one
 * flow of the workspace, which archives at once and offers Restore in its
 * toast. Every member of an org that is not suspended restores an archived
 * row until its `restoreUntil`, and the shortcut ends at that time while
 * the list shows. A member with write access gets Add to merge queue on
 * a row that can join, and Remove from queue on a queued row, which asks
 * first. A queued row offers no Move to section, because it shows in no
 * section (decision 317). Nothing here opens a workspace, starts its cloud
 * computer, or marks it as read.
 */
export function useRowMenus(props: {
  orgId: string
  viewer: User
  groups: readonly SectionGroup[]
  /** The rows of the Merge queue group. */
  queued?: readonly Workspace[]
  archived: readonly Workspace[]
  readOnly: boolean
  move: (workspaceId: string, target: DropTarget) => void
  queue?: RowQueue
}): {
  menus: RowMenus
  archiveAction: RowAction
  restoreAction: RowAction
  running: (workspaceId: string) => ArchiveAction | null
  layer: ReactNode
} {
  const app = useApp()
  const services = useServices()
  const { toast } = useToast()
  const phone = useViewport() === 'phone'
  const org = useStore(app.orgs).find((item) => item.id === props.orgId)
  const suspended = useStore(useOrgModel(props.orgId).suspension.suspended)
  const memory = shownWorkspaces(app, props.viewer)
  const lifecycle = useArchiveActions(props.orgId, props.viewer)
  const passed = usePassedDeadlines(
    props.archived.map((row) => row.restoreUntil),
  )
  const [scope, setScope] = useState(props.orgId)
  const [open, setOpen] = useState<OpenMenu | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const { groups, queue } = props
  // The menu, the field, and the question of another org close.
  if (scope !== props.orgId) {
    setScope(props.orgId)
    setOpen(null)
    setRenaming(null)
    setRemoving(null)
  }

  const live = groups.flatMap((group) => group.rows)
  const rows = [
    ...live.map((row) => row.workspace),
    ...(props.queued ?? []),
    ...props.archived,
  ]
  const find = (id: string) => rows.find((row) => row.id === id)
  const nested = new Set(
    live.flatMap((row) => (row.parentId === null ? [] : [row.workspace.id])),
  )
  const queued = new Set(props.queued?.map((workspace) => workspace.id))
  const itemsOf = (workspace: Workspace): RowMenuItem[] => {
    // Without the org, the role is unknown, so the menu offers only the
    // action that changes nothing.
    const readOnly = props.readOnly || !org
    const items = workspaceMenuItems({
      admin: org?.role === 'admin',
      owner: workspace.owner.id === props.viewer.id,
      archived: workspace.state === 'archived',
      // A queued row shows in no section, so it has no Move to section.
      otherSection: groups.length > 1 && !queued.has(workspace.id),
      readOnly,
      // A nested row moves only with its tree, so it has no Move to section.
      nested: nested.has(workspace.id),
    })
    const action =
      queue && !readOnly ? queueMenuAction(workspace, queue.facts) : undefined
    return withQueueItem(items, action)
  }
  const openRow = open ? find(open.workspaceId) : undefined
  const openItems = openRow ? itemsOf(openRow) : []
  if (open && openItems.length === 0) setOpen(null)
  const renamingRow = renaming ? find(renaming) : undefined
  if (renaming && !(renamingRow && renames(itemsOf(renamingRow)))) {
    setRenaming(null)
  }
  const removingRow = removing ? find(removing) : undefined
  const removes = (workspace: Workspace) =>
    itemsOf(workspace).some(
      (item) => item.kind === 'queue' && item.action === 'remove',
    )
  if (removing && !(removingRow && removes(removingRow))) setRemoving(null)

  const archive = (workspace: Workspace) => lifecycle.archive(workspace)
  const archiveAction: RowAction = (workspace) => {
    if (!org || props.readOnly) return undefined
    const access = { role: org.role, suspended }
    if (!mayArchive(access, workspace, props.viewer)) return undefined
    return () => archive(workspace)
  }
  const restoreAction: RowAction = (workspace) => {
    if (!org || props.readOnly) return undefined
    const ended = passed(workspace.restoreUntil)
    if (!mayRestore({ suspended }, workspace, ended)) return undefined
    return () => lifecycle.restore(workspace)
  }
  const save = async (workspace: Workspace, name: string) => {
    const target = { orgId: workspace.orgId, workspaceId: workspace.id }
    try {
      await memory.rename(target, name)
    } catch (error) {
      toast({
        title: "The workspace wasn't renamed.",
        description: errorMessage(error),
        tone: 'error',
      })
      return false
    }
    setRenaming((current) => (current === workspace.id ? null : current))
    return true
  }
  const copyLink = (workspace: Workspace) => {
    services.copy(workspace.link).then(
      () => toast({ title: linkResults.copied, tone: 'success' }),
      () => toast({ title: linkResults.failed, tone: 'error' }),
    )
  }
  const actions: RowActions = {
    move: (workspace, sectionId) =>
      props.move(workspace.id, { sectionId, index: 0 }),
    rename: (workspace) => setRenaming(workspace.id),
    copyLink,
    archive,
    reassigned: (workspace) => memory.reassigned(workspace),
    queue: (workspace, action) => {
      if (action === 'add') queue?.add(workspace.id)
      else setRemoving(workspace.id)
    },
  }

  const menus: RowMenus = (workspace) => {
    const items = itemsOf(workspace)
    if (items.length === 0) return undefined
    return {
      open: open?.workspaceId === workspace.id,
      show: (opening) => setOpen({ ...opening, workspaceId: workspace.id }),
      rename:
        renaming === workspace.id && renames(items)
          ? {
              save: (name) => save(workspace, name),
              cancel: () => setRenaming(null),
            }
          : null,
      startRename: renames(items)
        ? () => {
            setOpen(null)
            setRenaming(workspace.id)
          }
        : null,
    }
  }
  const sectionOf = (id: string) =>
    live.find((row) => row.workspace.id === id)?.sectionId ?? null
  const layer = (
    <>
      {open && openRow && openItems.length > 0 ? (
        <RowMenu
          actions={actions}
          close={() => setOpen(null)}
          items={openItems}
          key={open.workspaceId}
          opening={open}
          phone={phone}
          sectionId={sectionOf(open.workspaceId)}
          sections={groups.map((group) => group.section)}
          workspace={openRow}
        />
      ) : null}
      {queue && removing && removingRow ? (
        <RemoveQueueDialog
          close={() => setRemoving(null)}
          confirm={queue.remove}
          question={removeQuestionOf(
            removingRow,
            queue.facts,
            queue.known?.(removingRow.id),
          )}
        />
      ) : null}
    </>
  )
  return {
    menus,
    archiveAction,
    restoreAction,
    running: lifecycle.running,
    layer,
  }
}
