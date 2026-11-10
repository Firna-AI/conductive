import type { SchemaProps } from '@mokly/mokly'
import { inviteStates } from '../components/settings/inviteCodeCopy'
import { shortcutSearches } from '../components/settings/shortcutSearch'
import { keyChanges } from '../components/settings/ShortcutsSections'
import { browserHosts } from '../fixtures/shortcutHosts'

export const accountSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tab',
    'connections',
    'form',
    'view',
    'save',
    'shareChange',
    'invites',
    'keyChange',
    'shortcutSearch',
    'shortcuts',
    'host',
  ],
  properties: {
    /**
     * The tab: General, with the sign-in and the connections, Preferences,
     * or Keyboard shortcuts. Each tab has its own address.
     */
    tab: { enum: ['general', 'preferences', 'shortcuts'] },
    /** GitHub and the agents are connected, or not yet, as at the first run. */
    connections: { enum: ['connected', 'not-connected'] },
    /**
     * The Connect form that is open. Its agent is not connected yet, and the
     * other agent is.
     */
    form: { enum: ['none', 'claude', 'codex'] },
    /** How New workspace opens on a computer: as the page, or as a dialog. */
    view: { enum: ['page', 'dialog'] },
    /**
     * The save of the last change on Preferences: saved, or failed. A failed
     * save shows its error, and the choice keeps its saved value.
     */
    save: { enum: ['saved', 'failed'] },
    /**
     * The invite code of the user: invites left, sign-ups paused, every
     * invite used, or turned off by an operator.
     */
    invites: { enum: inviteStates },
    /**
     * The last change of a share setting: none, or a change of the Claude
     * login that the app did not save.
     */
    shareChange: { enum: ['none', 'not-saved'] },
    /**
     * The change of a shortcut on Keyboard shortcuts, in progress or last:
     * none, a row that records new keys, the same row after a fixed shortcut
     * that it did not take, a recorded shortcut of another command, the
     * question before Reset all, or a save that failed.
     */
    keyChange: { enum: keyChanges },
    /**
     * The search of Keyboard shortcuts: an empty field, a query that finds
     * commands by their labels and their words, a query that finds the
     * fixed keys of a focused workspace row and divider, or a query that
     * matches no row.
     */
    shortcutSearch: { enum: shortcutSearches },
    /**
     * The person's shortcuts: the defaults, or after a few changes, such as
     * ⇧⌘P for the palette.
     */
    shortcuts: { enum: ['default', 'edited'] },
    /**
     * Where the page runs, which sets the keys of Keyboard shortcuts: Chrome
     * or Firefox in a normal tab on a Mac, Chrome in a normal tab on
     * Windows, or the installed app of Chrome on a Mac. The Mac app draws
     * its own pages.
     */
    host: { enum: browserHosts },
  },
} as const

export type AccountState = SchemaProps<typeof accountSchema>

/** The General tab of a connected account, in Chrome on a Mac. */
export const accountGeneral: AccountState = {
  tab: 'general',
  connections: 'connected',
  form: 'none',
  view: 'page',
  save: 'saved',
  shareChange: 'none',
  invites: 'left',
  keyChange: 'none',
  shortcutSearch: 'none',
  shortcuts: 'default',
  host: 'chrome-mac',
}

/** The Keyboard shortcuts tab in a normal Chrome tab on a Mac. */
export const accountShortcuts: AccountState = {
  ...accountGeneral,
  tab: 'shortcuts',
}
