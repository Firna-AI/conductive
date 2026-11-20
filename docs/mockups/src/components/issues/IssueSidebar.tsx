import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Membership } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { paletteShortcut } from '../../fixtures/shortcutChanges'
import type { Section } from '../../fixtures/sections'
import { SectionList } from '../workspaces/SectionList'
import type { SidebarSection, WorkspaceRow } from '../workspaces/sections'
import {
  NewWorkspaceLink,
  AutomationsLink,
  SearchLink,
  SettingsLink,
} from '../workspaces/SidebarLinks'
import { WorkspaceRowView } from '../workspaces/WorkspaceRow'
import sidebar from '../workspaces/Sidebar.module.css'
import list from '../workspaces/SectionList.module.css'
import { IssueListRow, type IssueItem } from './IssueListRow'
import { IssuesLink } from './IssuesLink'

/** A row of a section that holds issues and workspaces. */
export type SidebarItem =
  { kind: 'workspace'; row: WorkspaceRow } | ({ kind: 'issue' } & IssueItem)

export type ItemSection = { section: Section; items: readonly SidebarItem[] }

function keyOf(item: SidebarItem): string {
  return item.kind === 'workspace' ? item.row.workspace.key : item.issue.key
}

/** The header of a section, as `SectionList` draws it, without its menu. */
function SectionHeading(props: { section: Section; count: number }) {
  const { section } = props
  const Chevron = section.collapsed ? ChevronRight : ChevronDown
  return (
    <div className={list.header}>
      <h3 className={list.heading}>
        <button
          aria-expanded={!section.collapsed}
          className={list.toggle}
          type="button"
        >
          <Chevron aria-hidden className={list.chevron} size={12} />
          <span className={list.name}>{section.name}</span>
          {section.collapsed ? (
            <span className={list.count}>{props.count}</span>
          ) : null}
        </button>
      </h3>
    </div>
  )
}

/** Sections whose rows mix issues and workspaces, in variations B and C. */
export function ItemSections(props: {
  sections: readonly ItemSection[]
  variant: 'sidebar' | 'page'
}) {
  return (
    <div className={list.sections}>
      {props.sections.map((item) => (
        <section
          aria-label={item.section.name}
          className={list.section}
          key={item.section.key}
        >
          <SectionHeading count={item.items.length} section={item.section} />
          {item.section.collapsed ? null : (
            <ul className={list.rows}>
              {item.items.map((row) => (
                <li key={keyOf(row)}>
                  {row.kind === 'workspace' ? (
                    <WorkspaceRowView
                      archivable
                      row={row.row}
                      variant={props.variant}
                    />
                  ) : (
                    <IssueListRow {...row} variant={props.variant} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

/**
 * The sidebar of the explorations: the org with its cog, New workspace,
 * Issues when the variation has an Issues page, Automations, Search, and
 * the sections. `sections` draws the workspace list of the app, and
 * `items` draws sections that mix issues and workspaces.
 */
export function IssueSidebar(props: {
  viewer: Membership
  current?: 'issues' | 'new-workspace'
  /** The Issues page, when the variation has one. */
  issuesTo?: string
  issuesCount?: number
  newWorkspaceTo?: string
  sections?: readonly SidebarSection[]
  items?: readonly ItemSection[]
}) {
  return (
    <>
      <div className={sidebar.top}>
        <h2 className={sidebar.org}>{orgs.acme.name}</h2>
        <SettingsLink />
      </div>
      <div className={sidebar.scroll} data-mokly-scroll="workspace-list">
        <div className={sidebar.links}>
          <NewWorkspaceLink
            current={props.current === 'new-workspace'}
            to={props.newWorkspaceTo}
            variant="sidebar"
          />
          {props.issuesTo ? (
            <IssuesLink
              count={props.issuesCount}
              current={props.current === 'issues'}
              to={props.issuesTo}
              variant="sidebar"
            />
          ) : null}
          <AutomationsLink variant="sidebar" />
          <SearchLink shortcut={paletteShortcut()} variant="sidebar" />
        </div>
        {props.items ? (
          <ItemSections sections={props.items} variant="sidebar" />
        ) : (
          <SectionList
            sections={props.sections ?? []}
            variant="sidebar"
            viewer={props.viewer}
          />
        )}
      </div>
    </>
  )
}
