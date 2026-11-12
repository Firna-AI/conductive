/**
 * The Triggers list of a routine form in each state that the mockups draw:
 * the saved triggers, the open Add trigger menu, and the editors of the
 * schedules and of the author filter.
 */

import type { AuthorFilter, Trigger } from './routines'

/** A trigger in the form of the owner, with the state of its editor. */
export type TriggerEdit = {
  trigger: Trigger
  /** The author filter of a pull request trigger is open. */
  filterOpen?: true
  /**
   * Text typed in the Author is list, which the suggestions match. An empty
   * text is a field with the focus, which offers every suggestion.
   */
  typed?: string
  /** A login of the filter that names no GitHub account. Save refused it. */
  unknownLogin?: string
  /** The custom cron runs more than once an hour, so the form refuses it. */
  refused?: true
}

/** What the Triggers list of the form shows. */
export const triggerViewKeys = [
  'saved',
  'menu',
  'hourly',
  'daily',
  'weekly',
  'custom-refused',
  'author-filter',
  'suggestions',
  'unknown-login',
] as const

export type TriggerView = (typeof triggerViewKeys)[number]

/** The views that draw the saved triggers of the routine. */
type SavedView = 'saved' | 'menu'

/**
 * The members of Acme and the bot that opens dependency updates. Cal added
 * the bot to an empty list, so the list added Members of Acme first.
 */
const authors: AuthorFilter = {
  members: true,
  is: ['dependabot[bot]'],
  isNot: [],
}

/** The triggers of each editor state, in place of the saved triggers. */
const triggerEdits: Readonly<
  Record<Exclude<TriggerView, SavedView>, readonly TriggerEdit[]>
> = {
  hourly: [{ trigger: { kind: 'hourly', minute: 15 } }],
  daily: [{ trigger: { kind: 'daily', time: { hour: 18, minute: 30 } } }],
  weekly: [
    {
      trigger: { kind: 'weekly', day: 'monday', time: { hour: 8, minute: 0 } },
    },
  ],
  'custom-refused': [
    { trigger: { kind: 'custom', cron: '*/15 9-17 * * 1-5' }, refused: true },
  ],
  'author-filter': [
    {
      trigger: { kind: 'pull-request', event: 'opened', authors },
      filterOpen: true,
    },
    {
      trigger: {
        kind: 'pull-request',
        event: 'pushed',
        authors: { members: false, is: [], isNot: ['calummoore'] },
      },
    },
  ],
  suggestions: [
    {
      trigger: {
        kind: 'pull-request',
        event: 'opened',
        authors: { members: false, is: ['dependabot[bot]'], isNot: [] },
      },
      filterOpen: true,
      typed: '',
    },
  ],
  'unknown-login': [
    {
      trigger: {
        kind: 'pull-request',
        event: 'opened',
        authors: { ...authors, is: [...authors.is, 'renovate-bot'] },
      },
      filterOpen: true,
      unknownLogin: 'renovate-bot',
    },
  ],
}

/** The triggers that a view of the form shows. */
export function editsOf(
  view: TriggerView,
  saved: readonly Trigger[],
): readonly TriggerEdit[] {
  if (view === 'saved' || view === 'menu') {
    return saved.map((trigger) => ({ trigger }))
  }
  return triggerEdits[view]
}
