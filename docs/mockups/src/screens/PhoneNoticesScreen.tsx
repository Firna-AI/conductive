import type { SchemaProps, Viewport } from '@mokly/mokly'
import { NoticeAsk } from '../components/phone/NoticeAsk'
import { systemAlertCopy } from '../components/phone/noticeCopy'
import { PhoneApp } from '../components/phone/PhoneApp'
import { SystemAlertOver } from '../components/phone/SystemAlert'
import { paths } from '../paths'
import { phonePaths } from '../phonePaths'
import { AccountScreen } from './AccountScreen'
import { deniedPreferences, phonePreferences } from './phonePreferences'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

export const phoneNoticesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['view'],
  properties: {
    /**
     * The ask of the phone app over the workspace, after the first message
     * of a turn; the alert of the system that its Turn on notices opens; or
     * the same alert over Preferences, after a Not now.
     */
    view: { enum: ['ask', 'system', 'system-preferences'] },
  },
} as const

export type PhoneNoticesState = SchemaProps<typeof phoneNoticesSchema>

/**
 * The workspace under the ask: Cal just sent a message, and the agent
 * works. Each answer shows it again, as the running turn of the chat.
 */
const askWorkspace: WorkspaceState = {
  ...readyWorkspace,
  conversation: 'running',
  banner: 'none',
}

/** The ask over the workspace, or the alert over the workspace or Preferences. */
function NoticesView(props: { state: PhoneNoticesState; viewport: Viewport }) {
  const { viewport } = props
  switch (props.state.view) {
    case 'ask':
      return (
        <WorkspaceScreen
          overlay={
            <NoticeAsk
              notNowTo={paths.turns}
              turnOnTo={phonePaths.noticesSystem}
              viewport={viewport}
            />
          }
          state={askWorkspace}
          viewport={viewport}
        />
      )
    case 'system':
      return (
        <SystemAlertOver
          allowTo={paths.turns}
          denyTo={paths.turns}
          words={systemAlertCopy}
        >
          <WorkspaceScreen state={askWorkspace} viewport={viewport} />
        </SystemAlertOver>
      )
    case 'system-preferences':
      return (
        <SystemAlertOver
          allowTo={phonePaths.noticesOn}
          denyTo={phonePaths.noticesDenied}
          words={systemAlertCopy}
        >
          <AccountScreen
            state={phonePreferences({
              ...deniedPreferences,
              notices: 'not-now',
            })}
            viewport={viewport}
          />
        </SystemAlertOver>
      )
  }
}

/**
 * The ask for notices of the phone app and the permission alert of the
 * system. The app asks once, after the member sends the first message of
 * a turn, in a sheet on a phone and in a dialog on a tablet. Turn on
 * notices opens the alert of the system, which lies over the whole
 * screen. After Not now, the Notices section of Preferences opens the
 * same alert. The screens under them mark the phone apps.
 */
export function PhoneNoticesScreen(props: {
  state: PhoneNoticesState
  viewport: Viewport
}) {
  return (
    <PhoneApp>
      <NoticesView state={props.state} viewport={props.viewport} />
    </PhoneApp>
  )
}
