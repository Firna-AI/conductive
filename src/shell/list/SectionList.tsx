import type { Workspace } from '../../shared/generated/Workspace'
import { Fragment, useState, type KeyboardEvent } from 'react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/workspaces/SectionList.module.css'
import type { ArchiveAction } from '../../app/archive-model'
import { shownTreeRows, topLevelRows, treeOf } from '../../app/list-trees'
import { stepTarget, type SectionGroup } from '../../app/sections'
import { workspaceRowMove } from '../../app/shortcuts/navigation'

import { nameLabel } from '../../shared/name-label'
import ui from '../ui/ui.module.css'
import { ArchivedGroup, useArchivedOpen } from './ArchivedGroup'
import type { DropTarget } from './drop-target'
import { useListKeys } from './list-keys'
import type { RowMenus } from './row-menu'
import { carriedText, DropLine, LiftedRow } from './RowDrop'
import { LiftedSection, SectionDropLine } from './SectionDrag'
import { SectionHeader, type SectionActions } from './SectionHeader'
import { useRowDrag } from './useRowDrag'
import { useSectionDrag } from './useSectionDrag'
import { useRowFocus } from './useRowFocus'
import { WorkspaceRow, type RowVariant } from './WorkspaceRow'

/** The nested rows that move with a top-level row: its tree without it. */
function carriedBy(
  groups: readonly SectionGroup[],
  workspaceId: string | undefined,
): Set<string> {
  if (workspaceId === undefined) return new Set()
  const tree = groups
    .map((group) => treeOf(group.rows, workspaceId))
    .find((rows) => rows.length > 0)
  return new Set(tree?.slice(1).map((row) => row.workspace.id))
}

/**
 * The sections of the org, each a group of workspaces that the people of
 * the org made, then the Archived group. A sub-workspace shows nested
 * under the row of its parent, indented by each row that the list shows
 * above it in its tree. A collapsed section hides its rows, but it still
 * shows the row of the open workspace, as `shownTreeRows` says. A top-level
 * row moves its whole tree to another place by drag and drop, by a long
 * press on a phone, or by Alt with Up or Down and no other modifier. The
 * tree stays faint in its place, and the line falls only between two trees.
 * A nested row moves only with its tree, so none of these moves it. A key with more modifiers, such as ⌥⌘↑,
 * stays free for its shortcut. A section moves to another place by a drag
 * of its name, or by the move items of its menu. `menus` gives each row its menu,
 * `archiveAction` its Archive shortcut, and `restoreAction` the Restore
 * shortcut of an archived row. `running` names the Archive or the Restore
 * of a row that runs, which its shortcut shows busy. A read-only list, as
 * in a suspended org, moves nothing and shows no section menu. While the
 * page shows the list, the keys of the workspaces open its rows, as
 * `useListKeys` says.
 */
export function SectionList(props: {
  groups: readonly SectionGroup[]
  archived: readonly Workspace[]
  variant: RowVariant
  selectedId: string | null
  now: number
  actions: SectionActions
  archiveAction?: (workspace: Workspace) => (() => void) | undefined
  restoreAction?: (workspace: Workspace) => (() => void) | undefined
  running?: (workspaceId: string) => ArchiveAction | null
  move: (workspaceId: string, target: DropTarget) => void
  readOnly: boolean
  /** The page shows this list, so it takes the keys of the workspaces. */
  offersKeys?: boolean
  menus?: RowMenus
}) {
  const [archived, setArchived] = useArchivedOpen(
    props.groups,
    props.archived,
    props.selectedId,
  )
  useListKeys({
    shown: [
      ...props.groups.flatMap((group) =>
        shownTreeRows(
          group.rows,
          group.section.collapsed,
          props.selectedId,
        ).map(({ row }) => row.workspace),
      ),
      ...(archived ? props.archived : []),
    ],
    selectedId: props.selectedId,
    offered: props.offersKeys ?? false,
  })
  const { drag, bind, still, layout } = useRowDrag(props.move)
  /** The nested rows of the dragged tree, which stay faint with it. */
  const carried = carriedBy(props.groups, drag?.item.id)
  /** A move by keys keeps the focus on its row. */
  const rowFocus = useRowFocus()
  /** What a move by keys or by a menu says to a screen reader. */
  const [announcement, setAnnouncement] = useState('')
  const actions: SectionActions = {
    ...props.actions,
    moveTo: (section, index) => {
      setAnnouncement(`${section.name} moves to place ${index + 1}.`)
      props.actions.moveTo(section, index)
    },
  }
  const sections = useSectionDrag(layout, actions.moveTo)
  const lifted = props.groups.find(
    (group) => group.section.id === sections.drag?.item.id,
  )
  /** The sections without the dragged one, where its drop line counts. */
  const others = props.groups.filter((group) => group !== lifted)
  const sectionLine = (index: number) =>
    lifted && sections.drag?.place === index ? (
      <SectionDropLine name={lifted.section.name} place={index + 1} />
    ) : null
  /** A row that `stays`, in a collapsed section, moves by no key. */
  const onKeyDown = (
    workspace: Workspace,
    event: KeyboardEvent<HTMLElement>,
    stays: boolean,
  ) => {
    const move = workspaceRowMove(event.nativeEvent)
    if (move === null) return
    event.preventDefault()
    if (stays) return
    const target = stepTarget(
      props.groups,
      workspace.id,
      move === 'up' ? -1 : 1,
    )
    if (!target) return
    const section = props.groups.find(
      (group) => group.section.id === target.sectionId,
    )
    const tree = carriedBy(props.groups, workspace.id).size
    setAnnouncement(
      `${nameLabel(workspace.name)}${carriedText(tree)} ${tree > 0 ? 'move' : 'moves'} to ${section?.section.name ?? 'another section'}, place ${target.index + 1}.`,
    )
    props.move(workspace.id, target)
  }
  return (
    <div className={styles.sections}>
      <span className={ui.hidden} role="status">
        {announcement}
      </span>
      {props.groups.map((group, position) => {
        const { section, rows } = group
        // A collapsed section shows no drop line: its rows are hidden.
        const target =
          !section.collapsed && drag?.place.sectionId === section.id
            ? drag.place
            : null
        // A drop lands before a top-level row, counted without the dragged
        // tree, or after the last tree.
        const places = topLevelRows(rows).filter(
          (row) => row.workspace.id !== drag?.item.id,
        )
        const before = target ? places[target.index] : undefined
        const shown = shownTreeRows(rows, section.collapsed, props.selectedId)
        const line = drag ? (
          <DropLine
            carried={carried.size}
            name={nameLabel(drag.item.name)}
            section={section.name}
          />
        ) : null
        return (
          <Fragment key={section.id}>
            {group === lifted ? null : sectionLine(others.indexOf(group))}
            <section
              aria-label={section.name}
              className={classes(
                styles.section,
                group === lifted && styles.faint,
              )}
              ref={layout.section(section.id)}
            >
              <SectionHeader
                actions={actions}
                bind={
                  props.readOnly ? undefined : sections.bind(section, position)
                }
                count={rows.length}
                place={{ index: position, total: props.groups.length }}
                readOnly={props.readOnly}
                section={section}
                variant={props.variant}
              />
              {section.collapsed && shown.length === 0 ? null : (
                <ul className={styles.rows}>
                  {shown.map(({ row, treeId, place, lines }) => {
                    const { workspace } = row
                    const moving =
                      drag?.item.id === workspace.id ||
                      carried.has(workspace.id)
                    // Only a top-level row of an open section drags. A
                    // nested row and the open row of a collapsed section,
                    // whose places the list hides, stay still.
                    const surface = props.readOnly
                      ? undefined
                      : row.parentId === null && !section.collapsed
                        ? bind(workspace, {
                            sectionId: section.id,
                            index: place,
                          })
                        : still(workspace)
                    return (
                      <Fragment key={workspace.id}>
                        {before?.workspace.id === workspace.id ? line : null}
                        <li>
                          <WorkspaceRow
                            bind={surface}
                            depth={row.depth}
                            drag={moving ? 'placeholder' : undefined}
                            focusRow={() => rowFocus.focusLink(workspace.id)}
                            linkRef={rowFocus.linkRef(workspace.id)}
                            lines={lines}
                            menu={props.menus?.(workspace)}
                            now={props.now}
                            onArchive={props.archiveAction?.(workspace)}
                            acting={
                              (props.running?.(workspace.id) ?? null) !== null
                            }
                            onKeyDown={
                              props.readOnly
                                ? undefined
                                : (event) =>
                                    onKeyDown(
                                      workspace,
                                      event,
                                      section.collapsed,
                                    )
                            }
                            onBlur={rowFocus.blur}
                            onFocus={(event) =>
                              rowFocus.focus(workspace.id, event)
                            }
                            rowRef={
                              // A drop counts only the trees of an open
                              // section.
                              section.collapsed
                                ? undefined
                                : layout.row(workspace.id, section.id, treeId)
                            }
                            selected={workspace.id === props.selectedId}
                            variant={props.variant}
                            workspace={workspace}
                          />
                        </li>
                      </Fragment>
                    )
                  })}
                  {target && before === undefined ? line : null}
                  {rows.length === 0 && !target ? (
                    <li className={styles.empty}>
                      New workspaces appear here.
                    </li>
                  ) : null}
                </ul>
              )}
            </section>
          </Fragment>
        )
      })}
      {sectionLine(others.length)}
      {props.archived.length > 0 ? (
        <ArchivedGroup
          menus={props.menus}
          now={props.now}
          onToggle={setArchived}
          open={archived}
          restoreAction={props.restoreAction}
          rows={props.archived}
          running={props.running}
          selectedId={props.selectedId}
          variant={props.variant}
        />
      ) : null}
      {drag ? (
        <LiftedRow
          carried={carried.size}
          drag={drag}
          now={props.now}
          variant={props.variant}
        />
      ) : null}
      {sections.drag && lifted ? (
        <LiftedSection count={lifted.rows.length} drag={sections.drag} />
      ) : null}
    </div>
  )
}
