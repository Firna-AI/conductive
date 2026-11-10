import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useToast } from '@firna/ui/toast'
import {
  workspaceMenuItems,
  type WorkspaceMenuItem,
} from '../../../docs/mockups/src/components/workspaces/workspaceMenu'
import { errorMessage } from '../../app/api/client'
import type { ArchiveModel } from '../../app/archive-model'
import { mayArchive } from '../../app/permissions'
import type { SectionGroup } from '../../app/sections'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { Workspace } from '../../shared/workspaces'
import { useApp, useOrgModel } from '../context'
import { useViewport } from '../ui/viewport'
import { ArchiveDialog } from '../workspace/ArchiveDialog'
import { shownWorkspaces } from '../workspace/tab-memory'
import type { DropTarget } from './drop-target'
import type { MenuOpening, RowMenus } from './row-menu'
import { RowMenu, type RowActions } from './RowMenu'

type OpenMenu = MenuOpening & { workspaceId: string }

/** An Archive question that the list draws over the current page. */
interface ListArchive {
  workspace: Workspace
  archive: ArchiveModel
}

const renames = (items: readonly WorkspaceMenuItem[]) =>
  items.some((item) => item.kind === 'action' && item.action === 'rename')

/**
 * The menus of the rows of a list, their Rename field, the Archive shortcut
 * of each row, and the Archive question of a row that the current page does
 * not show. Each row gets only the actions that the person can use, and a
 * row with none gets no menu. A change of the role, the workspace, or the
 * org drops an action that it takes away. The shortcut and Archive in the
 * menu run one flow for each workspace, so one action shows one question:
 * the page of the current workspace draws its own question. The state
 * belongs to the org of the list, so a change of the org closes it and
 * stops the list's own Archive check. Nothing here opens a workspace,
 * starts its cloud computer, or marks it as read.
 */
export function useRowMenus(props: {
  orgId: string
  viewer: User
  groups: readonly SectionGroup[]
  archived: readonly Workspace[]
  selectedId: string | null
  readOnly: boolean
  move: (workspaceId: string, target: DropTarget) => void
}): {
  menus: RowMenus
  archiveAction: (workspace: Workspace) => (() => void) | undefined
  layer: ReactNode
} {
  const app = useApp()
  const { toast } = useToast()
  const phone = useViewport() === 'phone'
  const org = useStore(app.orgs).find((item) => item.id === props.orgId)
  const suspended = useStore(useOrgModel(props.orgId).suspension.suspended)
  const memory = shownWorkspaces(app, props.viewer)
  const [scope, setScope] = useState(props.orgId)
  const [open, setOpen] = useState<OpenMenu | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<ListArchive | null>(null)
  const { groups, selectedId } = props
  // The menu, the field, and the question of another org close.
  if (scope !== props.orgId) {
    setScope(props.orgId)
    setOpen(null)
    setRenaming(null)
    setArchiving(null)
  }

  const rows = [
    ...groups.flatMap((group) => group.workspaces),
    ...props.archived,
  ]
  const find = (id: string) => rows.find((row) => row.id === id)
  const itemsOf = (workspace: Workspace): WorkspaceMenuItem[] =>
    props.readOnly || !org
      ? []
      : workspaceMenuItems({
          admin: org.role === 'admin',
          owner: workspace.owner.id === props.viewer.id,
          archived: workspace.state === 'archived',
          otherSection: groups.length > 1,
        })
  const openRow = open ? find(open.workspaceId) : undefined
  const openItems = openRow ? itemsOf(openRow) : []
  if (open && openItems.length === 0) setOpen(null)
  const renamingRow = renaming ? find(renaming) : undefined
  if (renaming && !(renamingRow && renames(itemsOf(renamingRow)))) {
    setRenaming(null)
  }

  // The page of a row draws its own question, so the list's question gives
  // way when its row becomes the current page, and a flow that the page does
  // not show stops. Else the list owns its flow, and stops it when the org
  // changes or the list closes.
  useEffect(() => {
    if (!archiving || archiving.workspace.id !== selectedId) return
    const { workspace, archive } = archiving
    const target = { orgId: workspace.orgId, workspaceId: workspace.id }
    if (memory.archive(target) !== archive) archive.cancel()
  }, [archiving, selectedId, memory])
  const owned = useRef<ArchiveModel | null>(null)
  useEffect(() => {
    const shown = archiving && archiving.workspace.id !== selectedId
    owned.current = shown ? archiving.archive : null
  })
  useEffect(
    () => () => {
      const archive = owned.current
      if (archive && archive.flow.get().step !== 'closed') archive.cancel()
    },
    [props.orgId],
  )

  // The shortcut and the menu start the same flow of the workspace.
  const archive = (workspace: Workspace) => {
    const target = { orgId: workspace.orgId, workspaceId: workspace.id }
    const flow = memory.archive(target)
    void flow.start()
    if (workspace.id !== selectedId) setArchiving({ workspace, archive: flow })
  }
  const archiveAction = (workspace: Workspace) => {
    if (!org || props.readOnly) return undefined
    const access = { role: org.role, suspended }
    if (!mayArchive(access, workspace, props.viewer)) return undefined
    return () => archive(workspace)
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
  const actions: RowActions = {
    move: (workspace, sectionId) =>
      props.move(workspace.id, { sectionId, index: 0 }),
    rename: (workspace) => setRenaming(workspace.id),
    archive,
    reassigned: (workspace) => memory.reassigned(workspace),
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
    }
  }
  const sectionOf = (id: string) =>
    groups.find((group) => group.workspaces.some((row) => row.id === id))
      ?.section.id ?? null
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
      {archiving && archiving.workspace.id !== selectedId ? (
        <ArchiveDialog
          archive={archiving.archive}
          workspace={find(archiving.workspace.id) ?? archiving.workspace}
        />
      ) : null}
    </>
  )
  return { menus, archiveAction, layer }
}
