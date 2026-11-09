import type { ApiError } from '../api/client'
import { rankRows, searchWords } from './matcher'
import { tabGroups } from './palette-groups'
import { rowTexts, withNumberLabel, type PaletteGroup } from './palette-rows'
import type {
  PaletteQuery,
  PaletteSource,
  RepositoryChoice,
} from './palette-source'

/** What shows in place of the groups, when the tab has no row. */
export type PaletteEmpty =
  | { kind: 'no-match'; query: string }
  | { kind: 'line'; text: string }
  | { kind: 'loading' }
  | { kind: 'failed'; error: ApiError }

export interface PaletteResults {
  groups: readonly PaletteGroup[]
  /** Set when `groups` is empty. */
  empty: PaletteEmpty | null
  repositories: readonly RepositoryChoice[]
}

/**
 * The line of the Workspaces tab without a workspace to show: it names the
 * chosen repository, or the org while the filter shows all repositories.
 */
function emptyLine(query: PaletteQuery, source: PaletteSource): string {
  const repository = source.repositories.find(
    (item) => item.id === query.repositoryId,
  )
  const place = repository?.fullName ?? source.org?.name
  const what = query.archived ? 'Archived workspaces' : 'Workspaces'
  return place === undefined
    ? `${what} show here`
    : `${what} of ${place} show here`
}

function emptyOf(
  query: PaletteQuery,
  source: PaletteSource,
  searching: boolean,
): PaletteEmpty {
  const { list } = source
  const needsList =
    query.tab === 'workspaces' || (query.tab === 'all' && searching)
  if (source.org && needsList && list.state === 'loading') {
    return { kind: 'loading' }
  }
  if (source.org && query.tab === 'workspaces' && list.state === 'failed') {
    return { kind: 'failed', error: list.error }
  }
  if (searching || query.tab !== 'workspaces') {
    return { kind: 'no-match', query: query.text.trim() }
  }
  return { kind: 'line', text: emptyLine(query, source) }
}

/** The repositories that the org uses, and those that hold its workspaces. */
function repositoryChoices(source: PaletteSource): RepositoryChoice[] {
  if (source.org === null) return []
  const { list } = source
  const workspaces = list.state === 'ready' ? list.value.workspaces : []
  const used = new Set(workspaces.map((workspace) => workspace.repositoryId))
  return source.repositories
    .filter((item) => item.selected || used.has(item.id))
    .map((item) => ({ id: item.id, name: item.fullName }))
}

/**
 * What the palette shows for a query: the groups of its tab with the rows
 * that match, ranked, and the groups without a match left out. A workspace
 * row shows the label of its number when a word of the query is in it.
 */
export function paletteResults(
  query: PaletteQuery,
  source: PaletteSource,
): PaletteResults {
  const words = searchWords(query.text)
  const searching = words.length > 0
  const groups = tabGroups(query, source, searching)
    .map((group) => ({
      label: group.label,
      rows: rankRows(group.rows, words, rowTexts).map((row) =>
        withNumberLabel(row, words),
      ),
    }))
    .filter((group) => group.rows.length > 0)
  return {
    groups,
    empty: groups.length > 0 ? null : emptyOf(query, source, searching),
    repositories: repositoryChoices(source),
  }
}
