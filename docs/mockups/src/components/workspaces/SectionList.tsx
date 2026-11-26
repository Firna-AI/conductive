import { Fragment } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { defined } from '../../defined'
import type { Membership } from '../../fixtures/members'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { menu } from '../../entries/components/common/Menu.mockup'
import { instanceKey } from '../../instanceKey'
import { archivedGroup } from '../../entries/components/workspaces/ArchivedGroup.mockup'
import { mergeQueueGroup } from '../../entries/components/workspaces/MergeQueueGroup.mockup'
import type { DrawnRow } from './ArchivedGroup'
import { sectionMenu, type SectionPlace } from './menus'
import { mayArchiveWorkspace } from './permissions'
import { queueEntries } from './queue'
import {
  archivableEntries,
  groupDropOf,
  queueActionsOf,
  type ListQueue,
} from './queueList'
import { RowDrop } from './RowDrop'
import { rowControls, type RowContext, type RowFocus } from './rowControls'
import type { RowControls } from './RowMenu'
import { sectionDrop } from '../../entries/components/workspaces/SectionDrop.mockup'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
  WorkspaceRow,
} from './sections'
import { isNested, treeOf } from './trees'
import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import styles from '../../../../../src/ui/components/workspaces/SectionList.module.css'

type Variant = 'sidebar' | 'page'

/**
 * How the list shows an open menu: beside its trigger, or only as the open
 * trigger, while a phone shows the menu as a sheet.
 */
export type MenuStyle = 'anchored' | 'sheet'

function SectionHeader(props: {
  item: SidebarSection
  variant: Variant
  open: boolean
  menuStyle: MenuStyle
  /** The org is suspended, so its sections have no menu. */
  readOnly: boolean
  place: SectionPlace
}) {
  const { section, rows } = props.item
  const Chevron = section.collapsed ? ChevronRight : ChevronDown
  return (
    <div
      className={classes(
        styles.header,
        props.variant === 'page' && styles.pageHeader,
      )}
    >
      <h3 className={styles.heading}>
        <button
          aria-expanded={!section.collapsed}
          className={styles.toggle}
          type="button"
        >
          <Chevron aria-hidden className={styles.chevron} size={12} />
          <span className={styles.name}>{section.name}</span>
          {section.collapsed ? (
            <span className={styles.count}>{rows.length}</span>
          ) : null}
        </button>
      </h3>
      {props.readOnly ? null : (
        <span className={classes(styles.more, props.open && styles.moreOpen)}>
          <iconButton.Component
            expanded={props.open}
            icon="more-horizontal"
            label={`More for ${section.name}`}
            menu
            moklyInstance={`more-${section.key}`}
            quiet
          />
        </span>
      )}
      {props.open && props.menuStyle === 'anchored' ? (
        <menu.Component
          entries={sectionMenu(props.place)}
          label={section.name}
          moklyInstance="section-menu"
          placement="below-end"
        />
      ) : null}
    </div>
  )
}

/** The archived row that the view draws, if any, with what it draws. */
function drawnOf(
  rows: readonly WorkspaceRow[],
  controlsOf: (row: WorkspaceRow) => RowControls | undefined,
): DrawnRow | undefined {
  for (const row of rows) {
    const controls = controlsOf(row)
    if (controls) return { workspace: row.workspace.key, controls }
  }
  return undefined
}

/**
 * The sections of the org, each a group of workspaces that the user made.
 * A collapsed section shows its header and its count, and only the row of
 * the open workspace when it holds that workspace. A workspace moves to
 * another section by drag and drop, and a section moves to another place
 * by a drag of its header. A dragged section stays faint in
 * its place, and a line between two sections shows where it lands. The sidebar uses compact
 * rows; the list page uses taller rows for touch. A sub-workspace shows
 * nested under the row of its parent. Only a top-level row drags, and its
 * whole tree moves with it: the tree stays faint in its place, and the line
 * falls only between two trees. `archived` adds the
 * Archived group at the end, open unless `archivedCollapsed`. `readOnly`
 * drops the menus of the sections and of the rows, for a suspended org.
 * `viewer` is the person who looks at the list, whose role decides Archive
 * and the menu of each row. `focus` names the row whose menu, field, or
 * hover the view draws. The props of `ListQueue` add the Merge queue group
 * at the top, as `queueList.ts` says.
 */
export function SectionList(
  props: {
    sections: readonly SidebarSection[]
    variant: Variant
    menu?: ListMenu
    menuStyle?: MenuStyle
    drag?: ListDrag
    archived?: readonly WorkspaceRow[]
    archivedCollapsed?: boolean
    readOnly?: boolean
    viewer: Membership
    focus?: RowFocus
  } & ListQueue,
) {
  const { viewer } = props
  const groupDrop = groupDropOf(props)
  const drag = props.drag?.kind === 'workspace' ? props.drag : undefined
  const sectionDrag = props.drag?.kind === 'section' ? props.drag : undefined
  /** The dragged tree: its top-level row, then the rows under it. */
  const tree = drag
    ? (props.sections
        .map((item) => treeOf(item.rows, drag.workspace))
        .find((rows) => rows.length > 0) ?? [])
    : []
  const dragged = tree.at(0)
  const moving = new Set(tree.map((row) => row.workspace.key))
  // A row of a section over the group stays faint in its place.
  if (groupDrop?.kind === 'add' || groupDrop?.kind === 'refused') {
    moving.add(groupDrop.row.workspace.key)
  }
  const liftedSection = props.sections.find(
    (item) => item.section.key === sectionDrag?.section,
  )
  /** The sections without the dragged one, where the drop line counts. */
  const rest = props.sections.filter((item) => item !== liftedSection)
  const sectionLine = (index: number) =>
    liftedSection && sectionDrag?.index === index ? (
      <sectionDrop.Component item={liftedSection} place={index + 1} />
    ) : null
  const context: RowContext = {
    viewer,
    sections: props.sections.map((item) => item.section.key),
    readOnly: props.readOnly ?? false,
    sheet: props.menuStyle === 'sheet',
    ...defined({ queue: queueActionsOf(props) }),
  }
  const controlsOf = (row: WorkspaceRow) =>
    rowControls(row, props.focus, context)
  const { queue } = props
  return (
    <div className={styles.sections}>
      {queue && (queue.blocks.length > 0 || groupDrop) ? (
        <mergeQueueGroup.Component
          archivable={archivableEntries(queue, viewer, context.readOnly)}
          moklyInstance="merge-queue"
          queue={queue}
          variant={props.variant}
          {...defined({
            drawn: drawnOf(
              queueEntries(queue).map((entry) => entry.row),
              controlsOf,
            ),
            drop: groupDrop,
          })}
        />
      ) : null}
      {props.sections.map((item, position) => {
        const { section } = item
        // A collapsed section hides its rows, but the open row stays in
        // sight, flat, as no other row of its tree shows.
        const shown = section.collapsed
          ? item.rows
              .filter((row) => row.selected)
              .map((row) => ({
                ...row,
                indent: 0 as const,
                lines: { last: false, through: [], hasNested: false },
              }))
          : item.rows
        const target =
          !section.collapsed && drag?.section === section.key ? drag : undefined
        const lifted = item === liftedSection
        // A drop lands between two trees: before the top-level row at the
        // index of the drag, counted without the dragged tree, or after the
        // last tree.
        const places = item.rows.filter(
          (row) => !isNested(row) && !moving.has(row.workspace.key),
        )
        const before = target ? places.at(target.index) : undefined
        const drop =
          target && dragged ? (
            <RowDrop
              carried={tree.length - 1}
              row={dragged}
              section={section.name}
              variant={props.variant}
            />
          ) : null
        return (
          <Fragment key={section.key}>
            {lifted ? null : sectionLine(rest.indexOf(item))}
            <section
              aria-label={section.name}
              className={classes(styles.section, lifted && styles.faint)}
            >
              <SectionHeader
                item={item}
                menuStyle={props.menuStyle ?? 'anchored'}
                open={props.menu?.section === section.key}
                place={{
                  first: position === 0,
                  last: position === props.sections.length - 1,
                }}
                readOnly={props.readOnly ?? false}
                variant={props.variant}
              />
              {shown.length === 0 && section.collapsed ? null : (
                <ul className={styles.rows}>
                  {shown.map((row) => (
                    <Fragment key={row.workspace.key}>
                      {row === before ? drop : null}
                      <li>
                        <workspaceRow.Component
                          archivable={
                            !props.readOnly &&
                            mayArchiveWorkspace(viewer, row.workspace.owner)
                          }
                          moklyInstance={instanceKey(row.workspace.key)}
                          row={row}
                          variant={props.variant}
                          {...defined({
                            controls: controlsOf(row),
                            drag: moving.has(row.workspace.key)
                              ? 'placeholder'
                              : undefined,
                          })}
                        />
                      </li>
                    </Fragment>
                  ))}
                  {before === undefined ? drop : null}
                  {item.rows.length === 0 && !drop ? (
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
      {sectionLine(rest.length)}
      {props.archived ? (
        <archivedGroup.Component
          open={!props.archivedCollapsed}
          readOnly={props.readOnly ?? false}
          rows={props.archived}
          variant={props.variant}
          {...defined({ drawn: drawnOf(props.archived, controlsOf) })}
        />
      ) : null}
    </div>
  )
}
