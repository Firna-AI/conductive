import type { FindState } from '../components/find/findMarks'

/**
 * The tabs whose text the mockups search: a session, a code file, a
 * Markdown preview, and a diff.
 */
export type FindTab = 'chat' | 'code' | 'markdown' | 'diff'

/**
 * The find bar of each tab with a query and its matches. The count gives
 * the matches of the drawn text of the tab, also inside its closed folds,
 * and the phrase names the current match.
 *
 * - The session finds "places" in the long chat of `findConversations.ts`.
 *   The 4th match is in a call line of the first fold, so the bar opened
 *   that fold.
 * - The code file finds "query", also in `MIN_QUERY_LENGTH`, because a
 *   match ignores case. Its line numbers are never matched.
 * - README.md finds "checkout" in a cell of its table, in a heading, and
 *   in a paragraph.
 * - The diff finds "line1" across the coloured tokens of its lines, on
 *   added, removed, and unchanged lines, and never in its signs.
 */
export const foundViews: Readonly<Record<FindTab, FindState>> = {
  chat: {
    query: 'places',
    count: { place: 4, total: 10 },
    current: 'src/app/api/places/route.ts',
    opened: ['read-proxy'],
  },
  code: {
    query: 'query',
    count: { place: 2, total: 6 },
    current: '(query: string)',
  },
  markdown: {
    query: 'checkout',
    count: { place: 1, total: 3 },
    current: 'Address suggestions at checkout',
  },
  diff: {
    query: 'line1',
    count: { place: 3, total: 7 },
    current: 'useAddressAutocomplete(line1)',
  },
}

/** A query that no text of the mockups holds. */
export const unmatchedQuery = 'throttle'
