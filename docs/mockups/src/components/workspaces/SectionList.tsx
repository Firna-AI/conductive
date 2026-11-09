import { Fragment } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'
import type { Membership } from '../../fixtures/members'
import { IconButton } from '../common/actions'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { Menu } from '../common/Menu'
import { ArchivedGroup } from './ArchivedGroup'
import { sectionMenu } from './menus'
import { mayArchiveWorkspace } from './permissions'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
  WorkspaceRow,
} from './sections'
import { WorkspaceRowView } from './WorkspaceRow'
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
          <IconButton
            expanded={props.open}
            icon={MoreHorizontal}
            label={`More for ${section.name}`}
            menu
            quiet
          />
        </span>
      )}
      {props.open && props.menuStyle === 'anchored' ? (
        <Menu
          entries={sectionMenu}
          label={section.name}
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
        <WorkspaceRowView
          drag="lifted"
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

/**
 * The sections of the org, each a group of workspaces that the user made.
 * A collapsed section shows only its header and its count. A workspace
 * moves to another section by drag and drop. The sidebar uses compact
 * rows; the list page uses taller rows for touch. `archived` adds the
 * Archived group at the end, open. `readOnly` drops the menus of the
 * sections, for a suspended org.
 */
export function SectionList(props: {
  sections: readonly SidebarSection[]
  variant: Variant
  menu?: ListMenu
  menuStyle?: MenuStyle
  drag?: ListDrag
  archived?: readonly WorkspaceRow[]
  readOnly?: boolean
  viewer: Membership
}) {
  const { drag, viewer } = props
  const dragged = props.sections
    .flatMap((item) => item.rows)
    .find((row) => row.workspace.key === drag?.workspace)
  return (
    <div className={styles.sections}>
      {props.sections.map((item) => {
        const { section } = item
        const target = drag?.section === section.key ? drag : undefined
        return (
          <section
            aria-label={section.name}
            className={styles.section}
            key={section.key}
          >
            <SectionHeader
              item={item}
              menuStyle={props.menuStyle ?? 'anchored'}
              open={props.menu?.section === section.key}
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
                      <WorkspaceRowView
                        archivable={
                          !props.readOnly &&
                          mayArchiveWorkspace(viewer, row.workspace.owner)
                        }
                        drag={
                          row.workspace.key === drag?.workspace
                            ? 'placeholder'
                            : undefined
                        }
                        row={row}
                        variant={props.variant}
                      />
                    </li>
                  </Fragment>
                ))}
                {item.rows.length === 0 ? (
                  <li className={styles.empty}>New workspaces appear here.</li>
                ) : null}
              </ul>
            )}
          </section>
        )
      })}
      {props.archived ? (
        <ArchivedGroup open rows={props.archived} variant={props.variant} />
      ) : null}
    </div>
  )
}
