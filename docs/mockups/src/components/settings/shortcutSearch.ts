import type { ShortcutGroup, ShortcutRow } from '../../fixtures/shortcuts'
import { matches } from '../palette/paletteSearch'

/**
 * The search of the Keyboard shortcuts tab: an empty field, a query that
 * finds commands by their labels and their words, a query that finds the
 * fixed keys of a focused workspace row and of a focused divider, a query
 * that finds one command, or a query that matches no row.
 */
export const shortcutSearches = [
  'none',
  'found',
  'fixed',
  'one-command',
  'no-match',
] as const

export type ShortcutSearch = (typeof shortcutSearches)[number]

/**
 * The text in the field of each search. "tab" finds commands by their
 * labels and by their words, and a fixed row of the palette. "move" finds
 * the keys of a focused workspace row and of a focused divider. "model"
 * finds only Model picker, at the end of the list. No row matches "merge".
 */
export const shortcutQueries: Readonly<Record<ShortcutSearch, string>> = {
  none: '',
  found: 'tab',
  fixed: 'move',
  'one-command': 'model',
  'no-match': 'merge',
}

/** A group that a query matches, with only its matching rows. */
export type MatchingGroup = {
  group: ShortcutGroup
  rows: readonly ShortcutRow[]
}

/** The texts of a row that a search looks at: its label and its words. */
function rowTexts(row: ShortcutRow): readonly string[] {
  return [row.label, ...(row.words ?? [])]
}

/**
 * The groups that a query matches, in their order, each with its matching
 * rows. A row matches as in the palette: each word of the query is in a
 * text of the row, in any case. Fixed rows match too. A group without a
 * matching row hides, and an empty query matches every row.
 */
export function matchingGroups(
  query: string,
  groups: readonly ShortcutGroup[],
): MatchingGroup[] {
  return groups
    .map((group) => ({
      group,
      rows: group.rows.filter((row) => matches(query, rowTexts(row))),
    }))
    .filter((shown) => shown.rows.length > 0)
}
