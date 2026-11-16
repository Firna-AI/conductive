import { Fragment } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { defined } from '../../defined'
import type { Membership } from '../../fixtures/members'
import { iconButton } from '../../entries/components/common/actions.mockup'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { menu } from '../../entries/components/common/Menu.mockup'
import { instanceKey } from '../../instanceKey'
import { archivedGroup } from '../../entries/components/workspaces/ArchivedGroup.mockup'
import type { DrawnRow } from './ArchivedGroup'
import { sectionMenu, type SectionPlace } from './menus'
import { mayArchiveWorkspace } from './permissions'
import { rowControls, type RowContext, type RowFocus } from './rowControls'
import type { RowControls } from './RowMenu'
import { sectionDrop } from '../../entries/components/workspaces/SectionDrop.mockup'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
  WorkspaceRow,
} from './sections'
import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import styles from './SectionList.module.css'

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

/** Where a dragged workspace lands: a line, and the row under the pointer. */
function DropTarget(props: {
  row: WorkspaceRow
  section: string
  variant: Variant
}) {
  return (
    <li className={styles.drop}>
      <span aria-hidden className={styles.line}>
        <span className={styles.lineEnd} />
      </span>
      <span aria-hidden className={styles.lifted}>
        <workspaceRow.Component
          drag="lifted"
          moklyInstance={`${instanceKey(props.row.workspace.key)}-lifted`}
          row={props.row}
          variant={props.variant}
        />
      </span>
      <span className={a11y.hidden} role="status">
        Moving {props.row.workspace.name} to {props.section}
      </span>
    </li>
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
 * A collapsed section shows only its header and its count. A workspace
 * moves to another section by drag and drop, and a section moves to
 * another place by a drag of its header. A dragged section stays faint in
 * its place, and a line between two sections shows where it lands. The sidebar uses compact
 * rows; the list page uses taller rows for touch. `archived` adds the
 * Archived group at the end, open unless `archivedCollapsed`. `readOnly`
 * drops the menus of the sections and of the rows, for a suspended org.
 * `viewer` is the person who looks at the list, whose role decides Archive
 * and the menu of each row. `focus` names the row whose menu, field, or
 * hover the view draws.
 */
export function SectionList(props: {
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
}) {
  const { viewer } = props
  const drag = props.drag?.kind === 'workspace' ? props.drag : undefined
  const sectionDrag = props.drag?.kind === 'section' ? props.drag : undefined
  const dragged = props.sections
    .flatMap((item) => item.rows)
    .find((row) => row.workspace.key === drag?.workspace)
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
  }
  const controlsOf = (row: WorkspaceRow) =>
    rowControls(row, props.focus, context)
  return (
    <div className={styles.sections}>
      {props.sections.map((item, position) => {
        const { section } = item
        const target = drag?.section === section.key ? drag : undefined
        const lifted = item === liftedSection
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
              {section.collapsed ? null : (
                <ul className={styles.rows}>
                  {item.rows.map((row, index) => (
                    <Fragment key={row.workspace.key}>
                      {target && dragged && index === target.index ? (
                        <DropTarget
                          row={dragged}
                          section={section.name}
                          variant={props.variant}
                        />
                      ) : null}
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
                            drag:
                              row.workspace.key === drag?.workspace
                                ? 'placeholder'
                                : undefined,
                          })}
                        />
                      </li>
                    </Fragment>
                  ))}
                  {item.rows.length === 0 ? (
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
