import type { ReactNode } from 'react'
import { isPendingCommand } from '../components/chat/PendingCommand'
import { AllowAllBar } from '../components/mac/AllowAllBar'
import { MacNotification } from '../components/mac/MacNotification'
import { MacScreen } from '../components/mac/MacScreen'
import { conversations as chats } from '../fixtures/conversations'
import { safariTest } from '../fixtures/mac'
import {
  editedShortcuts,
  type ShortcutChanges,
} from '../fixtures/shortcutChanges'
import { checkoutAutocomplete } from '../fixtures/workspaces'
import { AccountScreen } from './AccountScreen'
import { accountGeneral } from './accountState'
import type { MacAppState } from './macAppState'
import { NewWorkspaceScreen, newWorkspaceForm } from './NewWorkspaceScreen'
import { WaitlistScreen, type WaitlistState } from './WaitlistScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

/** The chat behind a command: the request waits, or it ran. */
const conversations = {
  none: 'history',
  prompt: 'mac-waiting',
  'prompt-long': 'mac-waiting-suite',
  choices: 'mac-waiting',
  many: 'mac-waiting-many',
  'many-choices': 'mac-waiting-many',
  'with-secret': 'mac-waiting-secret',
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

/**
 * The new workspace Saved carts just after its create, as on the web app:
 * its cloud computer starts, and its first message waits.
 */
const createdWorkspace: WorkspaceState = {
  ...readyWorkspace,
  workspace: 'saved-carts',
  sandbox: 'starting',
  conversation: 'queued',
  banner: 'no-commits',
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
  const composer = state.composer ?? readyWorkspace.composer
  switch (state.page) {
    case 'workspace':
      return (
        <WorkspaceScreen
          shortcuts={shortcuts}
          state={{
            ...workspaceFor(state.command),
            composer,
            palette: state.palette,
            sidebar: state.sidebar ?? 'shown',
            shownRequest: state.shownRequest ?? readyWorkspace.shownRequest,
          }}
          viewport="desktop"
        />
      )
    case 'new-workspace':
      return (
        <NewWorkspaceScreen
          shortcuts={shortcuts}
          state={{
            ...newWorkspaceForm,
            capabilities: state.capabilities ?? newWorkspaceForm.capabilities,
          }}
          viewport="desktop"
        />
      )
    case 'created':
      return (
        <WorkspaceScreen
          shortcuts={shortcuts}
          state={{ ...createdWorkspace, composer }}
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
    case 'this-mac':
      return (
        <AccountScreen
          state={{
            ...accountGeneral,
            tab: 'this-mac',
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
 * that workspace on every page. The Capabilities control of a workspace and
 * of New workspace shows the switch of Mac access of this Mac, which allows
 * all commands of the workspace on it. The Mac app gives the page every
 * key, so it shows the person's shortcuts: in the palette, in the Search
 * row, and on the Keyboard shortcuts tab of the account. The Mac app has
 * no phone layout, so a phone view shows the same screen, smaller.
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
      choicesOpen={command === 'choices' || command === 'many-choices'}
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
