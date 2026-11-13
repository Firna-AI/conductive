import type { SchemaProps } from '@mokly/mokly'
import type { ReactNode } from 'react'
import { isPendingCommand } from '../components/chat/PendingCommand'
import { AllowAllBar } from '../components/mac/AllowAllBar'
import { MacNotification } from '../components/mac/MacNotification'
import { MacScreen } from '../components/mac/MacScreen'
import { shortcutSearches } from '../components/settings/shortcutSearch'
import { keyChanges } from '../components/settings/ShortcutsSections'
import { conversations as chats } from '../fixtures/conversations'
import { safariTest } from '../fixtures/mac'
import {
  editedShortcuts,
  type ShortcutChanges,
} from '../fixtures/shortcutChanges'
import { checkoutAutocomplete } from '../fixtures/workspaces'
import { AccountScreen } from './AccountScreen'
import { accountGeneral } from './accountState'
import { NewWorkspaceScreen, newWorkspaceForm } from './NewWorkspaceScreen'
import { WaitlistScreen, type WaitlistState } from './WaitlistScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

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
     * The page of the app: a workspace, the empty New workspace, the
     * account, its Keyboard shortcuts tab, or the waitlist of a person
     * without app access.
     */
    page: {
      enum: ['workspace', 'new-workspace', 'account', 'shortcuts', 'waitlist'],
    },
    /**
     * A command that an agent asks to run on this Mac: none, the request
     * above the composer, the request of a longer time limit, the request
     * with the other ways to allow open, four requests with a long script,
     * the notification while the app is in the background, the 15 minutes
     * that allow every command, or the grant until the user stops it.
     */
    command: {
      enum: [
        'none',
        'prompt',
        'prompt-long',
        'choices',
        'many',
        'notification',
        'allow-all',
        'allow-until-stop',
      ],
    },
    /**
     * The result of the last change of the Mac's settings: none, Remove of
     * an always-allowed command in This Mac, Stop in the bar of a grant, or
     * Keep until I stop in the bar of the 15 minutes. The Mac made and
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
        'keep-failed',
      ],
    },
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

/** The chat behind a command: the request waits, or it ran. */
const conversations = {
  none: 'history',
  prompt: 'mac-waiting',
  'prompt-long': 'mac-waiting-suite',
  choices: 'mac-waiting',
  many: 'mac-waiting-many',
  notification: 'mac-waiting',
  'allow-all': 'mac-done',
  'allow-until-stop': 'mac-done',
} as const satisfies Record<
  MacAppState['command'],
  WorkspaceState['conversation']
>

function workspaceFor(command: MacAppState['command']): WorkspaceState {
  return { ...readyWorkspace, conversation: conversations[command] }
}

/** A person who waits, with no code tried yet, as on the web app. */
const waitingState: WaitlistState = {
  email: 'verified',
  code: 'none',
  from: 'field',
  invitations: 'none',
}

function pageFor(state: MacAppState): ReactNode {
  const shortcuts: ShortcutChanges =
    state.shortcuts === 'edited' ? editedShortcuts : {}
  switch (state.page) {
    case 'workspace':
      return (
        <WorkspaceScreen
          shortcuts={shortcuts}
          state={{ ...workspaceFor(state.command), palette: state.palette }}
          viewport="desktop"
        />
      )
    case 'new-workspace':
      return (
        <NewWorkspaceScreen
          shortcuts={shortcuts}
          state={newWorkspaceForm}
          viewport="desktop"
        />
      )
    case 'account':
      return (
        <AccountScreen
          state={{ ...accountGeneral, shortcuts: state.shortcuts }}
          viewport="desktop"
        />
      )
    case 'shortcuts':
      return (
        <AccountScreen
          state={{
            ...accountGeneral,
            tab: 'shortcuts',
            keyChange: state.keyChange,
            shortcutSearch: state.shortcutSearch,
            shortcuts: state.shortcuts,
          }}
          viewport="desktop"
        />
      )
    case 'waitlist':
      return <WaitlistScreen state={waitingState} viewport="desktop" />
  }
}

/**
 * The Mac app (decision 62): the web app in a window of macOS, with the
 * native window buttons at the top of its left panel, and the device
 * commands that agents ask to run on this Mac. A command waits in the chat
 * of its workspace, just above the composer, and the workspace list marks
 * that workspace on every page. The Mac app gives the page every key, so it
 * shows the person's shortcuts: in the palette, in the Search row, and on
 * the Keyboard shortcuts tab of the account. The Mac app has no phone
 * layout, so a phone view shows the same screen, smaller.
 */
export function MacAppScreen(props: { state: MacAppState }) {
  const { command, change } = props.state
  const waits = chats[conversations[command]].some(isPendingCommand)
  return (
    <MacScreen
      active={command !== 'notification'}
      banner={
        command === 'allow-all' || command === 'allow-until-stop' ? (
          <AllowAllBar untilStop={command === 'allow-until-stop'} />
        ) : undefined
      }
      change={change === 'none' ? undefined : change}
      choicesOpen={command === 'choices'}
      mode={props.state.window}
      needsInput={waits ? checkoutAutocomplete.key : undefined}
      notification={
        command === 'notification' ? (
          <MacNotification request={safariTest} />
        ) : undefined
      }
    >
      {pageFor(props.state)}
    </MacScreen>
  )
}
