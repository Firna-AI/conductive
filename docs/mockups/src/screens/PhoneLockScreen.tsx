import type { Viewport } from '@mokly/mokly'
import { LockScreen } from '../components/phone/LockScreen'
import {
  lockScreenNotices,
  lockScreenTime,
  type NoticePage,
} from '../fixtures/phoneNotices'
import { paths } from '../paths'
import {
  macCommandWorkspace,
  secretRequestWorkspace,
} from './waitingWorkspaces'
import { openWorkspace } from './workspaceRun'
import type { WorkspaceState } from './workspaceState'
import { workspaceName } from './workspaceTabs'

/**
 * A notice that opens the page of its work. Its title is the name that
 * the page shows for the workspace of its state, so the notice and the
 * page always name the same workspace.
 */
function opens(to: string, state: WorkspaceState): NoticePage {
  return { title: workspaceName(state, openWorkspace(state).record), to }
}

/**
 * The lock screen of the phone of Cal, with one notice for each kind of
 * event. A tablet in landscape shows the same notices beside the time.
 * The notice of the secret request opens its workspace, where the request
 * waits above the composer. The notice of the approval opens the command
 * that waits for the Mac of Cal.
 */
export function PhoneLockScreen(props: { viewport: Viewport }) {
  return (
    <LockScreen
      layout={props.viewport === 'mobile' ? 'phone' : 'tablet'}
      notices={lockScreenNotices({
        secret: opens(paths.secretRequests, secretRequestWorkspace),
        approval: opens(paths.macCommands, macCommandWorkspace),
      })}
      time={lockScreenTime}
    />
  )
}
