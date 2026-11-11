import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspaces/SectionList.module.css'
import type { ArchiveAction } from '../../app/archive-model'
import type { SectionGroup } from '../../app/sections'
import type { Workspace } from '../../shared/workspaces'
import type { RowMenus } from './row-menu'
import { WorkspaceRow, type RowVariant } from './WorkspaceRow'

/**
 * Whether the Archived group is open. It is collapsed until the user opens
 * it, and the user's choice then stays. Until then, the open archived
 * workspace opens it, but only when the user went to a workspace that was
 * already archived. An Archive of the open workspace keeps the group as it
 * was. So the list remembers the open workspace that it last showed in a
 * section. The list keeps this state, because the group does not show
 * while it has no rows.
 */
export function useArchivedOpen(
  groups: readonly SectionGroup[],
  archived: readonly Workspace[],
  selectedId: string | null,
): { open: boolean; setOpen: (open: boolean) => void } {
  const [opened, setOpened] = useState<boolean | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = groups.some((group) =>
    group.workspaces.some((row) => row.id === selectedId),
  )
  if (active && selectedId !== activeId) setActiveId(selectedId)
  const holdsSelected = archived.some((row) => row.id === selectedId)
  const open = opened ?? (holdsSelected && selectedId !== activeId)
  return { open, setOpen: setOpened }
}

/**
 * The archived workspaces at the end of the list. The group is the app's
 * own, not a section of the org, so it has no menu. `open` and `setOpen`
 * come from `useArchivedOpen`. An archived workspace opens with its chat
 * read-only. An admin's row has a menu that reassigns the workspace.
 * `restoreAction` gives a row its Restore shortcut, which covers its time
 * on hover, as Archive does.
 */
export function ArchivedGroup(props: {
  rows: readonly Workspace[]
  open: boolean
  setOpen: (open: boolean) => void
  variant: RowVariant
  selectedId: string | null
  now: number
  menus?: RowMenus
  restoreAction?: (workspace: Workspace) => (() => void) | undefined
  running?: (workspaceId: string) => ArchiveAction | null
}) {
  const { open } = props
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section aria-label="Archived" className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.heading}>
          <button
            aria-expanded={open}
            className={styles.toggle}
            onClick={() => props.setOpen(!open)}
            type="button"
          >
            <Chevron aria-hidden className={styles.chevron} size={12} />
            <span className={styles.name}>Archived</span>
            {open ? null : (
              <span className={styles.count}>{props.rows.length}</span>
            )}
          </button>
        </h3>
      </div>
      {open ? (
        <ul className={styles.rows}>
          {props.rows.map((row) => (
            <li key={row.id}>
              <WorkspaceRow
                acting={(props.running?.(row.id) ?? null) !== null}
                menu={props.menus?.(row)}
                now={props.now}
                onRestore={props.restoreAction?.(row)}
                selected={row.id === props.selectedId}
                variant={props.variant}
                workspace={row}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
