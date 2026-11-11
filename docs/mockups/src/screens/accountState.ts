import type { SchemaProps } from '@mokly/mokly'
import { signInSteps } from '../components/settings/chatGptSignInCopy'
import { accountLogins, loginKinds } from '../fixtures/logins'
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
    'codexLogin',
    'codexUse',
    'codexSignIn',
    'form',
    'view',
    'save',
    'shareChange',
    'invites',
    'ownEndpoint',
    'openSignUp',
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
    /** The kind of the Codex login while Codex is connected. */
    codexLogin: { enum: loginKinds },
    /**
     * Whether the app can still use the Codex login while Codex is
     * connected. A ChatGPT sign-in that OpenAI did not renew is not usable,
     * and its row shows the cause with Sign in again.
     */
    codexUse: { enum: ['usable', 'not-usable'] },
    /**
     * The Connect form that is open, and the kind that its switch selects:
     * the subscription token or the API key of Claude, or the API key or
     * the ChatGPT plan of Codex. Its agent is not connected yet, and the
     * other agent is.
     */
    form: {
      enum: ['none', 'claude', 'claude-api-key', 'codex', 'codex-token'],
    },
    /**
     * The step of the ChatGPT sign-in while the form of Codex has ChatGPT
     * plan selected: before the start, the code while the page waits for
     * the sign-in, the code expired, or the sign-in refused.
     */
    codexSignIn: { enum: signInSteps },
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
     * Open sign-up: an operator turned off the waitlist, and sign-ups are
     * not paused, so anyone can sign up without an invite.
     */
    openSignUp: { enum: ['off', 'on'] },
    /**
     * The last change of a share setting: none, or a change of the Claude
     * login that the app did not save.
     */
    shareChange: { enum: ['none', 'not-saved'] },
    /**
     * The own endpoint login: none, the open form on the own endpoint kind
     * with an empty address, with a typed address that the shared rule
     * changes before the save, or with an address that the rule refused, or
     * the logins after the connect. `unlisted` has those logins when the
     * model list of the proxy lacks a Claude model of the app. Except for
     * `none`, every connected login runs on Cal's proxy.
     */
    ownEndpoint: {
      enum: ['none', 'form', 'typed', 'refused', 'connected', 'unlisted'],
    },
    /**
     * The change of a shortcut on Keyboard shortcuts, in progress or last:
     * none, a row that records new keys in place of a shortcut, the same
     * row after a fixed shortcut that it did not take, a row that records
     * one more shortcut, a recorded shortcut of another command, a Reset
     * whose default shortcut another command holds, the question before
     * Reset all, a Reset all that failed, or a save that failed.
     */
    keyChange: { enum: keyChanges },
    /**
     * The search of Keyboard shortcuts: an empty field, a query that finds
     * commands by their labels and their words, a query that finds the
     * fixed keys of a focused workspace row and divider, a query that finds
     * only Model picker, or a query that matches no row.
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
     * Windows, Chrome or Firefox in a normal tab on Linux, or the installed
     * app of Chrome on a Mac. The Mac app draws its own pages.
     */
    host: { enum: browserHosts },
  },
} as const

export type AccountState = SchemaProps<typeof accountSchema>

/** The General tab of a connected account, in Chrome on a Mac. */
export const accountGeneral: AccountState = {
  tab: 'general',
  connections: 'connected',
  codexLogin: accountLogins.codex.kind,
  codexUse: 'usable',
  codexSignIn: 'start',
  form: 'none',
  view: 'page',
  save: 'saved',
  shareChange: 'none',
  invites: 'left',
  ownEndpoint: 'none',
  openSignUp: 'off',
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
