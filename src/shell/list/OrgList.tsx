import { useEffect, useState } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { ApiError } from '../../app/api/client'
import { useListTime } from '../../app/deadlines'
import { groupWorkspaces, type SectionGroup } from '../../app/sections'
import { useStore, valueOf } from '../../app/store'
import { useNow } from '../../app/time'
import type { User } from '../../shared/api'
import { useOrgModel } from '../context'
import { usePaletteOffer } from '../palette/palette-context'
import { LoadFailure } from '../ui/LoadFailure'
import ui from '../ui/ui.module.css'
import { NewSectionDialog } from './NewSectionDialog'
import type { SectionActions } from './SectionHeader'
import { SectionList } from './SectionList'
import { useListActions } from './useListActions'
import { useListQueue } from './useListQueue'
import { useRowMenus } from './useRowMenus'
import type { RowVariant } from './WorkspaceRow'

/**
 * The collapse of each section in this view only, for a read-only list. A
 * suspended org refuses each change of a section, also a collapse, but its
 * members still open each section to read it.
 */
function useLocalCollapse(actions: SectionActions) {
  const [collapsed, setCollapsed] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  )
  const local: SectionActions = {
    ...actions,
    toggle: (section) =>
      setCollapsed((current) =>
        new Map(current).set(section.id, !section.collapsed),
      ),
  }
  const apply = (groups: readonly SectionGroup[]): readonly SectionGroup[] =>
    groups.map((group) => {
      const value = collapsed.get(group.section.id)
      return value === undefined
        ? group
        : { ...group, section: { ...group.section, collapsed: value } }
    })
  return { actions: local, apply }
}

/**
 * The workspaces of an org in their sections, as the sidebar and the list
 * page show them, under the Merge queue group while a queue has entries,
 * with the New section dialog while it is open. Each row has
 * the menu of the actions that `viewer` can use. `readOnly` shows them
 * without changes, for a suspended org, and each menu then holds only Copy
 * link. `offerActions` says that
 * the page shows this list, so it offers New section to the command
 * palette, and its rows take the keys of the workspaces.
 */
export function OrgList(props: {
  orgId: string
  viewer: User
  variant: RowVariant
  selectedId: string | null
  readOnly?: boolean
  offerActions?: boolean
}) {
  const readOnly = props.readOnly ?? false
  const org = useOrgModel(props.orgId)
  const theme = useSharedUiTheme()
  const sections = useStore(org.sections)
  const workspaces = useStore(org.workspaces)
  const now = useNow(30_000)
  // A removed workspace leaves the list at the end of its Restore.
  const listTime = useListTime(valueOf(workspaces) ?? [])
  const { actions, move, adding, create, cancelAdding } = useListActions(org)
  const local = useLocalCollapse(actions)
  usePaletteOffer(
    props.offerActions && !readOnly
      ? {
          scope: { kind: 'org', orgId: props.orgId },
          actions: [{ id: 'new-section', run: () => actions.newSection() }],
        }
      : null,
  )
  useEffect(() => org.watch('list'), [org])
  const groups =
    sections.state === 'ready' && workspaces.state === 'ready'
      ? groupWorkspaces(sections.value, workspaces.value, listTime)
      : { sections: [], queued: [], archived: [] }
  const queue = useListQueue(org, valueOf(workspaces) ?? [], groups.queued)
  const { menus, archiveAction, restoreAction, running, layer } = useRowMenus({
    orgId: props.orgId,
    viewer: props.viewer,
    groups: groups.sections,
    queued: groups.queued,
    archived: groups.archived,
    readOnly,
    move,
    queue: queue.rows,
  })
  const failure = (error: ApiError) => (
    <LoadFailure
      error={error}
      retry={() => org.reload('list')}
      title="The workspaces didn't load"
    />
  )
  if (sections.state === 'failed') return failure(sections.error)
  if (workspaces.state === 'failed') return failure(workspaces.error)
  if (sections.state === 'loading' || workspaces.state === 'loading') {
    return (
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading the workspaces"
          color={theme.colors.muted}
          size={13}
        />
      </div>
    )
  }
  return (
    <>
      <SectionList
        actions={readOnly ? local.actions : actions}
        archiveAction={archiveAction}
        archived={groups.archived}
        restoreAction={restoreAction}
        running={running}
        groups={readOnly ? local.apply(groups.sections) : groups.sections}
        menus={menus}
        move={move}
        now={now}
        offersKeys={props.offerActions ?? false}
        queue={queue.list}
        readOnly={readOnly}
        selectedId={props.selectedId}
        variant={props.variant}
      />
      {adding && !readOnly ? (
        <NewSectionDialog close={cancelAdding} create={create} />
      ) : null}
      {layer}
    </>
  )
}
