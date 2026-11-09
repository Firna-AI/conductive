import type { SchemaProps } from '@mokly/mokly'
import type { ReactNode } from 'react'
import { isPendingCommand } from '../components/chat/PendingCommand'
import { AllowAllBar } from '../components/mac/AllowAllBar'
import { MacNotification } from '../components/mac/MacNotification'
import { MacScreen } from '../components/mac/MacScreen'
import { conversations as chats } from '../fixtures/conversations'
import { safariTest } from '../fixtures/mac'
import { checkoutAutocomplete } from '../fixtures/workspaces'
import { AccountScreen, accountGeneral } from './AccountScreen'
import { NewWorkspaceScreen, newWorkspaceForm } from './NewWorkspaceScreen'
import { WaitlistScreen, type WaitlistState } from './WaitlistScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

export const macAppSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['window', 'page', 'command', 'change'],
  properties: {
    /** A normal window, or full screen, where macOS hides the buttons. */
    window: { enum: ['window', 'full-screen'] },
    /**
     * The page of the app: a workspace, the empty New workspace, the
     * account, or the waitlist of a person without app access.
     */
    page: { enum: ['workspace', 'new-workspace', 'account', 'waitlist'] },
    /**
     * A command that an agent asks to run on this Mac: none, the request
     * above the composer, the request of a longer time limit, the request
     * with the other ways to allow open, four requests with a long script,
     * the notification while the app is in the background, or the 15
     * minutes that allow every command.
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
      ],
    },
    /**
     * The result of the last change of the Mac's settings: none, Remove of
     * an always-allowed command in This Mac, or Stop in the bar of the 15
     * minutes. The Mac made and saved it, made it but did not save it, or
     * did not make it.
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
      ],
    },
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
  switch (state.page) {
    case 'workspace':
      return (
        <WorkspaceScreen
          state={workspaceFor(state.command)}
          viewport="desktop"
        />
      )
    case 'new-workspace':
      return <NewWorkspaceScreen state={newWorkspaceForm} viewport="desktop" />
    case 'account':
      return <AccountScreen state={accountGeneral} viewport="desktop" />
    case 'waitlist':
      return <WaitlistScreen state={waitingState} viewport="desktop" />
  }
}

/**
 * The Mac app (decision 62): the web app in a window of macOS, with the
 * native window buttons at the top of its left panel, and the device
 * commands that agents ask to run on this Mac. A command waits in the chat
 * of its workspace, just above the composer, and the workspace list marks
 * that workspace on every page. The Mac app has no phone layout, so a
 * phone view shows the same screen, smaller.
 */
export function MacAppScreen(props: { state: MacAppState }) {
  const { command, change } = props.state
  const waits = chats[conversations[command]].some(isPendingCommand)
  return (
    <MacScreen
      active={command !== 'notification'}
      banner={command === 'allow-all' ? <AllowAllBar /> : undefined}
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
