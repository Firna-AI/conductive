import { Fragment, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import styles from '../../../docs/mockups/src/components/workspaces/SectionList.module.css'
import { stepTarget, type SectionGroup } from '../../app/sections'
import type { Workspace } from '../../shared/workspaces'
import ui from '../ui/ui.module.css'
import { ArchivedGroup } from './ArchivedGroup'
import type { DropTarget } from './drop-target'
import { SectionHeader, type SectionActions } from './SectionHeader'
import { useRowDrag, type RowDragState } from './useRowDrag'
import { useRowFocus } from './useRowFocus'
import { WorkspaceRow, type RowVariant } from './WorkspaceRow'
import list from './list.module.css'

/** The line where a dragged workspace lands. It marks a place, not an edge. */
function DropLine(props: { name: string; section: string }) {
  return (
    <li className={styles.drop}>
      <span aria-hidden className={styles.line}>
        <span className={styles.lineEnd} />
      </span>
      <span className={ui.hidden} role="status">
        Moving {props.name} to {props.section}
      </span>
    </li>
  )
}

/** The lifted row under the pointer. It takes no pointer input. */
function LiftedRow(props: {
  drag: RowDragState
  variant: RowVariant
  now: number
}) {
  const { drag } = props
  return createPortal(
    <div
      className={list.lifted}
      style={{
        left: drag.x - drag.offsetX,
        top: drag.y - drag.offsetY,
        width: drag.width,
      }}
    >
      <WorkspaceRow
        drag="lifted"
        now={props.now}
        selected={false}
        variant={props.variant}
        workspace={drag.workspace}
      />
    </div>,
    document.body,
  )
}

/**
 * The sections of the org, each a group of workspaces that the people of
 * the org made, then the Archived group. A workspace moves to another
 * section by drag and drop, by a long press on a phone, or by Alt and an
 * arrow key.
 */
export function SectionList(props: {
  groups: readonly SectionGroup[]
  archived: readonly Workspace[]
  variant: RowVariant
  selectedId: string | null
  now: number
  actions: SectionActions
  move: (workspaceId: string, target: DropTarget) => void
}) {
  const { drag, bind, layout } = useRowDrag(props.move)
  /** A move by keys keeps the focus on its row. */
  const rows = useRowFocus()
  /** What a move by keys says to a screen reader. */
  const [announcement, setAnnouncement] = useState('')
  const onKeyDown = (
    workspace: Workspace,
    event: KeyboardEvent<HTMLElement>,
  ) => {
    if (!event.altKey) return
    const step =
      event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const target = stepTarget(props.groups, workspace.id, step)
    if (!target) return
    const section = props.groups.find(
      (group) => group.section.id === target.sectionId,
    )
    setAnnouncement(
      `${workspace.name} moves to ${section?.section.name ?? 'another section'}, place ${target.index + 1}.`,
    )
    props.move(workspace.id, target)
  }
  return (
    <div className={styles.sections}>
      <span className={ui.hidden} role="status">
        {announcement}
      </span>
      {props.groups.map(({ section, workspaces }) => {
        const target =
          drag?.target.sectionId === section.id ? drag.target : null
        const rest = workspaces.filter((item) => item.id !== drag?.workspace.id)
        const line = drag ? (
          <DropLine name={drag.workspace.name} section={section.name} />
        ) : null
        return (
          <section
            aria-label={section.name}
            className={styles.section}
            key={section.id}
            ref={layout.section(section.id)}
          >
            <SectionHeader
              actions={props.actions}
              count={workspaces.length}
              section={section}
              variant={props.variant}
            />
            {section.collapsed ? null : (
              <ul className={styles.rows}>
                {workspaces.map((workspace, index) => (
                  <Fragment key={workspace.id}>
                    {target && rest[target.index]?.id === workspace.id
                      ? line
                      : null}
                    <li>
                      <WorkspaceRow
                        bind={bind(workspace, { sectionId: section.id, index })}
                        drag={
                          drag?.workspace.id === workspace.id
                            ? 'placeholder'
                            : undefined
                        }
                        linkRef={rows.linkRef(workspace.id)}
                        now={props.now}
                        onKeyDown={(event) => onKeyDown(workspace, event)}
                        onLinkBlur={rows.blur}
                        onLinkFocus={(event) => rows.focus(workspace.id, event)}
                        rowRef={layout.row(workspace.id, section.id)}
                        selected={workspace.id === props.selectedId}
                        variant={props.variant}
                        workspace={workspace}
                      />
                    </li>
                  </Fragment>
                ))}
                {target && target.index >= rest.length ? line : null}
                {workspaces.length === 0 && !target ? (
                  <li className={styles.empty}>New workspaces appear here.</li>
                ) : null}
              </ul>
            )}
          </section>
        )
      })}
      {props.archived.length > 0 ? (
        <ArchivedGroup
          now={props.now}
          rows={props.archived}
          selectedId={props.selectedId}
          variant={props.variant}
        />
      ) : null}
      {drag ? (
        <LiftedRow drag={drag} now={props.now} variant={props.variant} />
      ) : null}
    </div>
  )
}
