import { useEffect, useRef, useState } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { ApiError } from '../../app/api/client'
import { groupWorkspaces, type SectionGroup } from '../../app/sections'
import { useStore } from '../../app/store'
import { useNow } from '../../app/time'
import { useOrgModel } from '../context'
import { usePaletteOffer } from '../palette/palette-context'
import { LoadFailure } from '../ui/LoadFailure'
import ui from '../ui/ui.module.css'
import type { SectionActions } from './SectionHeader'
import { SectionList } from './SectionList'
import { useListActions } from './useListActions'
import { useListArchive } from './useListArchive'
import type { RowVariant } from './WorkspaceRow'
import list from './list.module.css'

function NewSectionField(props: {
  create: (name: string) => void
  cancel: () => void
}) {
  const [name, setName] = useState('')
  // Enter and the blur that follows both finish the field: only the first counts.
  const finished = useRef(false)
  const finish = () => {
    if (finished.current) return
    finished.current = true
    if (name.trim() === '') props.cancel()
    else props.create(name.trim())
  }
  return (
    <div className={list.newSection}>
      <InputFrame
        accessibilityLabel="Name of the new section"
        autoFocus
        onBlur={finish}
        onChangeText={setName}
        onKeyPress={(event) => {
          if (event.nativeEvent.key !== 'Escape') return
          finished.current = true
          props.cancel()
        }}
        onSubmitEditing={finish}
        placeholder="Section name"
        size="sm"
        value={name}
      />
    </div>
  )
}

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
 * page show them, with the field of a new section at the end. `readOnly`
 * shows them without changes, for a suspended org. `offerActions` says
 * that the page shows this list, so it offers New section to the command
 * palette.
 */
export function OrgList(props: {
  orgId: string
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
  const { actions, move, adding, create, cancelAdding } = useListActions(org)
  const archive = useListArchive(org, readOnly)
  const local = useLocalCollapse(actions)
  usePaletteOffer(
    props.offerActions && !readOnly
      ? {
          scope: { kind: 'org', orgId: props.orgId },
          actions: [{ id: 'new-section', run: actions.newSection }],
        }
      : null,
  )
  useEffect(() => org.watch('list'), [org])
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
  const groups = groupWorkspaces(sections.value, workspaces.value)
  return (
    <>
      <SectionList
        actions={readOnly ? local.actions : actions}
        archiveAction={archive.actionFor}
        archived={groups.archived}
        groups={readOnly ? local.apply(groups.sections) : groups.sections}
        move={move}
        now={now}
        readOnly={readOnly}
        selectedId={props.selectedId}
        variant={props.variant}
      />
      {archive.dialog}
      {adding && !readOnly ? (
        <NewSectionField cancel={cancelAdding} create={create} />
      ) : null}
    </>
  )
}
