import type { SchemaProps } from '@mokly/mokly'
import { shortcutSearches } from '../components/settings/shortcutSearch'
import { keyChanges } from '../components/settings/ShortcutsSections'
import { composerStateProperties } from './composerState'
import { newWorkspaceFormProperties } from './newWorkspaceParts'
import { requestStateProperties } from './requestState'

/**
 * The state of the Mac app screen. Each catalogue entry of the screen is a
 * set of these props, and Mokly's serve controls can change each one.
 */
export const macAppSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'window',
    'page',
    'command',
    'change',
    'palette',
    'keyChange',
    'shortcutSearch',
    'shortcuts',
  ],
  properties: {
    /** A normal window, or full screen, where macOS hides the buttons. */
    window: { enum: ['window', 'full-screen'] },
    /**
     * The sidebar of a workspace: shown, hidden with the toggle, or hidden
     * with the workspace list open as a popover of the tile of the org.
     */
    sidebar: { enum: ['shown', 'hidden', 'popover'] },
    /**
     * The page of the app: a workspace, the empty New workspace, the new
     * workspace Saved carts just after its create, while its cloud
     * computer starts, the account, its Keyboard shortcuts tab, its This
     * Mac tab, or the waitlist of a person without app access.
     */
    page: {
      enum: [
        'workspace',
        'new-workspace',
        'created',
        'account',
        'shortcuts',
        'this-mac',
        'waitlist',
      ],
    },
    /**
     * A command that an agent asks to run on this Mac: none, the request
     * above the composer, the request of a longer time limit, the request
     * with the other ways to allow open, four requests with a long script,
     * the same four with the other ways to allow of the first one open, the
     * request with a late request for a secret behind it, the notification
     * while the app is in the background, the 15 minutes that allow every
     * command, or the grant until the user stops it.
     */
    command: {
      enum: [
        'none',
        'prompt',
        'prompt-long',
        'choices',
        'many',
        'many-choices',
        'with-secret',
        'notification',
        'allow-all',
        'allow-until-stop',
      ],
    },
    /**
     * The place of the card on top of the stack of requests above the
     * composer, from 1, as on the workspace screen.
     */
    shownRequest: requestStateProperties.shownRequest,
    /**
     * The result of the last change of the Mac's settings: none, Remove of
     * an always-allowed command in This Mac, Stop in the bar of a grant, or
     * Keep until I stop or Extend in the bar of the 15 minutes. The Mac made and
     * saved it, made it but did not save it, or did not make it.
     */
    change: {
      enum: [
        'none',
        'removed',
        'remove-not-saved',
        'remove-failed',
        'stopped',
        'stop-not-saved',
        'stop-failed',
        'extended',
        'extend-failed',
        'keep-failed',
      ],
    },
    /**
     * The composer of a workspace page, as `composerStates` says, such as
     * the Capabilities control with the switch of Mac access of this Mac.
     * Without it, the composer is empty.
     */
    composer: composerStateProperties.composer,
    /**
     * The Capabilities control of New workspace, as the property of its
     * form says. Without it, the control is closed.
     */
    capabilities: newWorkspaceFormProperties.capabilities,
    /**
     * The command palette over the workspace: closed, or open on the All,
     * Actions, or Settings tab, whose rows show their keys.
     */
    palette: { enum: ['closed', 'all', 'actions', 'settings'] },
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
  },
} as const

export type MacAppState = SchemaProps<typeof macAppSchema>
