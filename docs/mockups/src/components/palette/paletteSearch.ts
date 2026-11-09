import { repositories } from '../../fixtures/repositories'
import { workspaceLabel } from '../workspaces/label'
import type { WorkspaceRow } from '../workspaces/sections'
import type { PaletteRow } from './paletteContent'

/** The words of a query, in lower case. */
function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '')
}

/** Whether each word of the query is in one of the texts, in any case. */
function matches(query: string, texts: readonly string[]): boolean {
  const haystack = texts.join(' ').toLowerCase()
  return queryWords(query).every((word) => haystack.includes(word))
}

/** A search looks at the label of the number as at the name. */
function workspaceTexts(row: WorkspaceRow): string[] {
  const { workspace } = row
  return [
    workspace.name,
    workspaceLabel(workspace.number),
    workspace.branch,
    repositories[workspace.repository].name,
  ]
}

function rowTexts(row: PaletteRow): readonly string[] {
  if (row.kind === 'workspace') return workspaceTexts(row.row)
  return [row.command.label, ...(row.command.words ?? [])]
}

/**
 * A workspace row of a search shows the label of its number when a word of
 * the query is in the label, so rows that match a part of a number differ.
 */
function withNumber(query: string, row: PaletteRow): PaletteRow {
  if (row.kind !== 'workspace') return row
  const label = workspaceLabel(row.row.workspace.number)
  const shown = queryWords(query).some((word) =>
    label.toLowerCase().includes(word),
  )
  return shown ? { ...row, number: label } : row
}

/**
 * The rows of a group that a query matches, in their order. Each word of
 * the query must be in a text of the row, in any case. A workspace row
 * also shows the label of its number when the query matches the label.
 */
export function matchingRows(
  query: string,
  rows: readonly PaletteRow[],
): PaletteRow[] {
  return rows
    .filter((row) => matches(query, rowTexts(row)))
    .map((row) => withNumber(query, row))
}
