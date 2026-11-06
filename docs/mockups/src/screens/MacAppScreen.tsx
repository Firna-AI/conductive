import type { SchemaProps } from '@mokly/mokly'
import type { ReactNode } from 'react'
import { AllowAllBar } from '../components/mac/AllowAllBar'
import { CommandPrompt } from '../components/mac/CommandPrompt'
import { MacNotification } from '../components/mac/MacNotification'
import { MacScreen } from '../components/mac/MacScreen'
import { safariSuite, safariTest } from '../fixtures/mac'
import { AccountScreen } from './AccountScreen'
import { NewWorkspaceScreen } from './NewWorkspaceScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

export const macAppSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['window', 'page', 'command'],
  properties: {
    /** A normal window, or full screen, where macOS hides the buttons. */
    window: { enum: ['window', 'full-screen'] },
    /** The page of the app: a workspace, the empty New workspace, or the account. */
    page: { enum: ['workspace', 'new-workspace', 'account'] },
    /**
     * A command that an agent asks to run on this Mac: none, the prompt,
     * the prompt of a longer time limit, the notification while the app is
     * in the background, or the 15 minutes that allow every command.
     */
    command: {
      enum: ['none', 'prompt', 'prompt-long', 'notification', 'allow-all'],
    },
  },
} as const

export type MacAppState = SchemaProps<typeof macAppSchema>

/** The chat behind a command: the request waits, or it ran. */
const conversations = {
  none: 'history',
  prompt: 'mac-waiting',
  'prompt-long': 'mac-waiting-suite',
  notification: 'mac-waiting',
  'allow-all': 'mac-done',
} as const satisfies Record<
  MacAppState['command'],
  WorkspaceState['conversation']
>

function workspaceFor(command: MacAppState['command']): WorkspaceState {
  return { ...readyWorkspace, conversation: conversations[command] }
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
      return (
        <NewWorkspaceScreen state={{ result: 'form' }} viewport="desktop" />
      )
    case 'account':
      return (
        <AccountScreen
          state={{ connections: 'connected', form: 'none' }}
          viewport="desktop"
        />
      )
  }
}

/**
 * The Mac app (decision 62): the web app in a window of macOS, with the
 * native window buttons at the top of its left panel, and the device
 * commands that agents ask to run on this Mac. The Mac app has no phone
 * layout, so a phone view shows the same screen, smaller.
 */
export function MacAppScreen(props: { state: MacAppState }) {
  const { command } = props.state
  const prompt =
    command === 'prompt' || command === 'prompt-long' ? (
      <CommandPrompt
        request={command === 'prompt' ? safariTest : safariSuite}
      />
    ) : undefined
  return (
    <MacScreen
      active={command !== 'notification'}
      banner={command === 'allow-all' ? <AllowAllBar /> : undefined}
      mode={props.state.window}
      notification={
        command === 'notification' ? (
          <MacNotification request={safariTest} />
        ) : undefined
      }
      overlay={prompt}
    >
      {pageFor(props.state)}
    </MacScreen>
  )
}
