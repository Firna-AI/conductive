import { orgs } from '../../fixtures/orgs'
import { repositories, type RepositoryKey } from '../../fixtures/repositories'
import { archivedWorkspaceList } from '../../fixtures/workspaces'
import {
  workspaceSections,
  type OpenWorkspace,
  type WorkspaceRow,
} from '../workspaces/sections'
import {
  accountSettings,
  appActions,
  orgActions,
  orgSettings,
  orgSettingsLabel,
  workspaceActions,
  type Command,
} from './paletteCommands'
import {
  palettePlaceholders,
  paletteQueries,
  phonePlaceholders,
  viewTabs,
  type OpenPaletteView,
  type PaletteTab,
} from './paletteViews'

export type PaletteRow =
  | { kind: 'workspace'; row: WorkspaceRow }
  /** `detail` names the page of a setting in a mixed list. */
  | { kind: 'command'; command: Command; detail?: string }

export type PaletteGroup = { label: string; rows: readonly PaletteRow[] }

/** The two filters of the Workspaces tab. */
export type PaletteFilters = {
  repository: string
  state: 'Active' | 'Archived'
  /** The menu of the repository filter lies open. */
  repositoryMenu: boolean
}

export type PaletteContent = {
  tab: PaletteTab
  query: string
  /** The words in the empty search field, on desktop and on a phone. */
  placeholder: { desktop: string; mobile: string }
  filters?: PaletteFilters
  groups: readonly PaletteGroup[]
  /** The line of a tab that has no row to show while the field is empty. */
  empty?: string
}

/**
 * Where the palette opens: over an open workspace, whose actions come
 * first, or over a page without one. Only the owner of the workspace and
 * the admins of the org can archive it.
 */
export type PaletteContext = {
  open?: OpenWorkspace
  archivable: boolean
  rightColumn?: boolean
}

/**
 * The workspaces with the latest activity, the latest first, as decision
 * 146 chose. The open one is left out.
 */
const recentKeys = [
  'email-dark-mode',
  'fix-cart-flake',
  'webhook-retries',
  'apple-pay',
  'next-16',
  'invoice-fonts',
] as const

const recentLimit = 5

const archivedRows: readonly WorkspaceRow[] = archivedWorkspaceList.map(
  (workspace) => ({ workspace, status: 'archived', selected: false }),
)

function workspaceRows(rows: readonly WorkspaceRow[]): PaletteRow[] {
  return rows.map((row) => ({ kind: 'workspace', row }))
}

function commandRows(
  commands: readonly Command[],
  detail?: string,
): PaletteRow[] {
  return commands.map((command) => ({ kind: 'command', command, detail }))
}

function actionsOf(context: PaletteContext): Command[] {
  const own = context.open
    ? workspaceActions(context.archivable, context.rightColumn)
    : []
  return [...own, ...orgActions, ...appActions]
}

/** The settings, each with the page that holds it, for a mixed list. */
function settingRows(): PaletteRow[] {
  return [
    ...commandRows(orgSettings, orgSettingsLabel),
    ...commandRows(accountSettings, 'Account'),
  ]
}

/** Whether each word of the query is in one of the texts, in any case. */
function matches(query: string, texts: readonly string[]): boolean {
  const haystack = texts.join(' ').toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '')
    .every((word) => haystack.includes(word))
}

function workspaceTexts(row: WorkspaceRow): string[] {
  const { workspace } = row
  return [
    workspace.name,
    workspace.branch,
    repositories[workspace.repository].name,
  ]
}

function rowTexts(row: PaletteRow): readonly string[] {
  if (row.kind === 'workspace') return workspaceTexts(row.row)
  return [row.command.label, ...(row.command.words ?? [])]
}

/**
 * The results of a query on the All tab: the workspaces, the actions, and
 * the settings that match, then the archived workspaces that match.
 */
function searchGroups(
  query: string,
  active: readonly WorkspaceRow[],
  context: PaletteContext,
): PaletteGroup[] {
  const groups: PaletteGroup[] = [
    { label: 'Workspaces', rows: workspaceRows(active) },
    { label: 'Actions', rows: commandRows(actionsOf(context)) },
    { label: 'Settings', rows: settingRows() },
    { label: 'Archived', rows: workspaceRows(archivedRows) },
  ]
  return groups
    .map((group) => ({
      label: group.label,
      rows: group.rows.filter((row) => matches(query, rowTexts(row))),
    }))
    .filter((group) => group.rows.length > 0)
}

const allRepositories = 'All repositories'

/** The repository that the empty Workspaces tab chooses. */
const emptyRepository: RepositoryKey = 'marketing-site'

function filters(view: OpenPaletteView): PaletteFilters {
  const empty = view === 'workspaces-empty'
  return {
    repository: empty ? repositories[emptyRepository].name : allRepositories,
    state: view === 'workspaces-archived' || empty ? 'Archived' : 'Active',
    repositoryMenu: view === 'workspaces-repository',
  }
}

/** The archived workspaces of one repository, or of all, in one group. */
function archivedGroups(repository?: RepositoryKey): PaletteGroup[] {
  const rows = archivedRows.filter(
    (row) =>
      repository === undefined || row.workspace.repository === repository,
  )
  if (rows.length === 0) return []
  return [{ label: 'Archived', rows: workspaceRows(rows) }]
}

/**
 * The line of the Workspaces tab when it has no workspace to show and the
 * field is empty. It says where the workspaces of the filters show: in the
 * chosen repository, or in the org.
 */
function emptyLine(filters: PaletteFilters): string {
  const place =
    filters.repository === allRepositories ? orgs.acme.name : filters.repository
  return filters.state === 'Archived'
    ? `Archived workspaces of ${place} show here`
    : `Workspaces of ${place} show here`
}

function groupsOf(
  view: OpenPaletteView,
  context: PaletteContext,
): PaletteGroup[] {
  const sections = workspaceSections(context.open)
  const active = sections.flatMap((section) => section.rows)
  switch (view) {
    case 'all': {
      const recent = recentKeys
        .filter((key) => key !== context.open?.workspace.key)
        .slice(0, recentLimit)
        .flatMap((key) => active.filter((row) => row.workspace.key === key))
      return [
        { label: 'Recent workspaces', rows: workspaceRows(recent) },
        { label: 'Actions', rows: commandRows(actionsOf(context)) },
        { label: 'Settings', rows: settingRows() },
      ]
    }
    case 'workspaces':
    case 'workspaces-repository':
      return sections.map((section) => ({
        label: section.section.name,
        rows: workspaceRows(section.rows),
      }))
    case 'workspaces-archived':
      return archivedGroups()
    case 'workspaces-empty':
      return archivedGroups(emptyRepository)
    case 'actions': {
      const open = context.open
      const own: PaletteGroup[] = open
        ? [
            {
              label: open.workspace.name,
              rows: commandRows(
                workspaceActions(context.archivable, context.rightColumn),
              ),
            },
          ]
        : []
      return [
        ...own,
        { label: orgs.acme.name, rows: commandRows(orgActions) },
        { label: 'Orgs', rows: commandRows(appActions) },
      ]
    }
    case 'settings':
      return [
        { label: orgSettingsLabel, rows: commandRows(orgSettings) },
        { label: 'Account', rows: commandRows(accountSettings) },
      ]
    case 'search':
    case 'no-results':
      return searchGroups(paletteQueries[view] ?? '', active, context)
  }
}

/** What the palette shows in one of its states. */
export function paletteContent(
  view: OpenPaletteView,
  context: PaletteContext,
): PaletteContent {
  const tab = viewTabs[view]
  const query = paletteQueries[view] ?? ''
  const tabFilters = tab === 'workspaces' ? filters(view) : undefined
  const groups = groupsOf(view, context)
  return {
    tab,
    query,
    placeholder: {
      desktop: palettePlaceholders[tab],
      mobile: phonePlaceholders[tab],
    },
    filters: tabFilters,
    groups,
    empty:
      tabFilters && query === '' && groups.length === 0
        ? emptyLine(tabFilters)
        : undefined,
  }
}
