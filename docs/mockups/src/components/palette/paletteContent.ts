import { archivedWorkspaceList } from '../../fixtures/archivedWorkspaces'
import { orgs } from '../../fixtures/orgs'
import { repositories, type RepositoryKey } from '../../fixtures/repositories'
import type { ShortcutChanges } from '../../fixtures/shortcutChanges'
import {
  workspaceSections,
  type OpenWorkspace,
  type WorkspaceRow,
} from '../workspaces/sections'
import {
  appActions,
  orgActions,
  workspaceActions,
  type Command,
} from './paletteCommands'
import { matchingRows } from './paletteSearch'
import {
  accountSettings,
  orgSettings,
  orgSettingsLabel,
} from './paletteSettings'
import {
  palettePlaceholders,
  paletteQueries,
  paletteStatuses,
  phonePlaceholders,
  viewTabs,
  type OpenPaletteView,
  type PaletteStatus,
  type PaletteTab,
} from './paletteViews'

export type PaletteRow =
  /** `number` is the label of the number, when the query matches it. */
  | { kind: 'workspace'; row: WorkspaceRow; number?: string }
  /** `detail` names the page of a setting in a mixed list. */
  | { kind: 'command'; command: Command; detail?: string }

type PaletteGroup = { label: string; rows: readonly PaletteRow[] }

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
  /**
   * The workspace data that did not load. The spinner or the notice stands
   * first, in place of the workspace groups, and the other groups follow.
   */
  status?: PaletteStatus
  /** The line of a tab that has no row to show while the field is empty. */
  empty?: string
}

/**
 * Where the palette opens: over an open workspace, whose actions come
 * first, or over a page without one. Only the owner of the workspace and
 * the admins of the org can archive it. Every member of an org that is
 * not suspended can restore an archived workspace while the app keeps its
 * cloud computer. The Mac app adds This Mac to the settings.
 */
export type PaletteContext = {
  open?: OpenWorkspace
  archivable: boolean
  restorable?: boolean
  rightColumn?: boolean
  mac?: boolean
  /**
   * The person's changes to the shortcuts (decision 190). On desktop, each
   * command row ends with the first key of its command that works where
   * the palette opens.
   */
  shortcuts?: ShortcutChanges
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

/** The actions of the open workspace, when the palette has one. */
function openActions(context: PaletteContext): Command[] {
  if (!context.open) return []
  return workspaceActions({
    archived: context.open.status === 'archived',
    archivable: context.archivable,
    restorable: context.restorable ?? false,
    rightColumn: context.rightColumn ?? true,
  })
}

function actionsOf(context: PaletteContext): Command[] {
  return [...openActions(context), ...orgActions, ...appActions]
}

/** The settings, each with the page that holds it, for a mixed list. */
function settingRows(context: PaletteContext): PaletteRow[] {
  return [
    ...commandRows(orgSettings, orgSettingsLabel),
    ...commandRows(accountSettings(context), 'Account'),
  ]
}

/**
 * The results of a query on the All tab: the workspaces, the actions, and
 * the settings that match, then the archived workspaces that match. Without
 * the workspace data, only the actions and the settings can match.
 */
function searchGroups(
  query: string,
  active: readonly WorkspaceRow[],
  context: PaletteContext,
  loaded: boolean,
): PaletteGroup[] {
  const groups: PaletteGroup[] = [
    { label: 'Workspaces', rows: loaded ? workspaceRows(active) : [] },
    { label: 'Actions', rows: commandRows(actionsOf(context)) },
    { label: 'Settings', rows: settingRows(context) },
    { label: 'Archived', rows: loaded ? workspaceRows(archivedRows) : [] },
  ]
  return groups
    .map((group) => ({
      label: group.label,
      rows: matchingRows(query, group.rows),
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
        { label: 'Settings', rows: settingRows(context) },
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
    case 'workspaces-unavailable':
      return []
    case 'actions': {
      const open = context.open
      const own: PaletteGroup[] = open
        ? [
            {
              label: open.workspace.name,
              rows: commandRows(openActions(context)),
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
        { label: 'Account', rows: commandRows(accountSettings(context)) },
      ]
    case 'search':
    case 'number':
    case 'number-part':
    case 'no-results':
    case 'search-loading':
    case 'search-unavailable':
    case 'search-repositories-unavailable':
      return searchGroups(
        paletteQueries[view] ?? '',
        active,
        context,
        paletteStatuses[view] === undefined,
      )
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
  const status = paletteStatuses[view]
  return {
    tab,
    query,
    placeholder: {
      desktop: palettePlaceholders[tab],
      mobile: phonePlaceholders[tab],
    },
    filters: tabFilters,
    groups,
    status,
    empty:
      tabFilters && query === '' && groups.length === 0 && !status
        ? emptyLine(tabFilters)
        : undefined,
  }
}
