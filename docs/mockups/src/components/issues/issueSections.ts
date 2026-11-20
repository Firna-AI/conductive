import {
  issueList,
  postcodeIssue,
  type Issue,
  type IssueStatus,
} from '../../fixtures/issues'
import { workspaceOf } from '../../fixtures/issueWorkspaces'
import { sectionKeys, sections } from '../../fixtures/sections'
import { workspaceList, type Workspace } from '../../fixtures/workspaces'
import type { SidebarSection, WorkspaceRow } from '../workspaces/sections'
import type { ItemSection, SidebarItem } from './IssueSidebar'

/** What the list shows open, and the screen that each row opens. */
export type ListFocus = {
  /** The key of the open issue or workspace. */
  open?: string
  /** The issues whose workspaces exist by the time of the screen. */
  started?: Readonly<Record<string, readonly string[]>>
  /** The screen that each issue or workspace opens, by its key. */
  links?: Readonly<Record<string, string>>
  /** The state of a started issue, when it moved past In progress. */
  statuses?: Readonly<Record<string, IssueStatus>>
}

function rowOf(workspace: Workspace, focus: ListFocus): WorkspaceRow {
  return {
    workspace,
    status: workspace.status,
    github: workspace.github,
    selected: focus.open === workspace.key,
    to: focus.links?.[workspace.key],
  }
}

/** The issue with the workspaces that exist by the time of the screen. */
function issueAt(issue: Issue, focus: ListFocus): Issue {
  const started = focus.started?.[issue.key]
  if (!started) return issue
  const status = focus.statuses?.[issue.key] ?? 'in-progress'
  return { ...issue, status, workspaces: started }
}

/** The issues of the list at the time of the screen. */
export function issuesAt(focus: ListFocus): Issue[] {
  return issueList.map((issue) => issueAt(issue, focus))
}

/** The workspaces of the list, with those that a start made, newest first. */
function workspacesAt(focus: ListFocus): Workspace[] {
  const made = Object.values(focus.started ?? {})
    .flat()
    .map(workspaceOf)
  return [...made, ...workspaceList]
}

/**
 * Variation A and D: the workspace list of the app, with the workspaces
 * that a start made at the top of their section.
 */
export function pageSections(focus: ListFocus): SidebarSection[] {
  const all = workspacesAt(focus)
  return sectionKeys.map((key) => ({
    section: sections[key],
    rows: all
      .filter((workspace) => workspace.section === key)
      .map((workspace) => rowOf(workspace, focus)),
  }))
}

/**
 * Variation B: each section holds its issues that wait for a start, then
 * its workspaces. A start turns the row of the issue into the row of its
 * workspace, in the same place.
 */
export function oneListSections(focus: ListFocus): ItemSection[] {
  const issues = issuesAt(focus).filter(
    (issue) =>
      issue.workspaces.length === 0 &&
      (issue.status === 'todo' || issue.status === 'backlog'),
  )
  const all = workspacesAt(focus)
  return sectionKeys.map((key) => ({
    section: sections[key],
    items: [
      ...issues
        .filter((issue) => issue.section === key)
        .map((issue): SidebarItem => ({
          kind: 'issue',
          issue,
          selected: focus.open === issue.key,
          to: focus.links?.[issue.key],
          end: issue.updated,
        })),
      ...all
        .filter((workspace) => workspace.section === key)
        .map((workspace): SidebarItem => ({
          kind: 'workspace',
          row: rowOf(workspace, focus),
        })),
    ],
  }))
}

/**
 * Variation C: each issue with workspaces heads a tree of them, and each
 * workspace without an issue is a top-level row. Issues without a
 * workspace stay on the Issues page.
 */
export function parentSections(focus: ListFocus): ItemSection[] {
  const issues = issuesAt(focus).filter(
    (issue) => issue.workspaces.length > 0 && issue.status !== 'done',
  )
  const linked = new Set(issues.flatMap((issue) => issue.workspaces))
  const all = workspacesAt(focus)
  return sectionKeys.map((key) => {
    const trees = issues
      .filter((issue) => issue.section === key)
      .flatMap((issue): SidebarItem[] => {
        const count = issue.workspaces.length
        const head: SidebarItem = {
          kind: 'issue',
          issue,
          selected: focus.open === issue.key,
          to: focus.links?.[issue.key],
          lines: { last: false, through: [], hasNested: true },
        }
        const nested = issue.workspaces.map(
          (workspace, index): SidebarItem => ({
            kind: 'workspace',
            row: {
              ...rowOf(workspaceOf(workspace), focus),
              indent: 1,
              lines: {
                last: index === count - 1,
                through: [],
                hasNested: false,
              },
            },
          }),
        )
        return [head, ...nested]
      })
    const loose = all
      .filter(
        (workspace) => workspace.section === key && !linked.has(workspace.key),
      )
      .map((workspace): SidebarItem => ({
        kind: 'workspace',
        row: rowOf(workspace, focus),
      }))
    return { section: sections[key], items: [...trees, ...loose] }
  })
}

/** The issue that every flow starts from, after Start made its workspace. */
export const postcodeStarted = { [postcodeIssue.key]: ['guest-postcode'] }

/** The postcode issue after the start of two attempts, in variation C. */
export const postcodeAttempts = {
  [postcodeIssue.key]: ['guest-postcode-claude', 'guest-postcode-codex'],
}
