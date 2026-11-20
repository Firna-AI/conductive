import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const capabilities = defineScreen({
  title: 'Capabilities of a workspace',
  description:
    'Cal pressed the Capabilities icon beside the paperclip in Checkout address autocomplete. The control opens above the icon, with the parts of New workspace. Secrets lists each secret of Acme with its checkbox: FIGMA_TOKEN is pre-approved, and SENTRY_AUTH_TOKEN is for all agents. This session lists each approval of the open session with who allowed it and when: PROD_DATABASE_URL, which Cal allowed. It hides the approval of FIGMA_TOKEN, because the workspace pre-approves that secret, and the approval of VERCEL_TOKEN, which belongs to another session. Values for this workspace lists the value of MAPBOX_TOKEN that Priya gave. Each approval and each value has Remove. Mac access is on, because a member turned it on. On a phone, Capabilities in the menu of the + button opens the control as a sheet, as app/capabilities/menu shows.',
  rationale:
    'Secrets decision 8 B: the same Capabilities icon shows in each workspace, beside the message box. Every member sees and changes the pre-approved secrets and Mac access there, and removes the approvals of the session and each value for this workspace. The control shows only the approvals of the session that it opens from, because an approval covers that session only. It hides an approval whose secret the workspace already allows, because that approval adds nothing. It meets "edited from workspace settings", it gives the undo of a wrong grant, and it keeps each capability in one place. An approval belongs to its secret and lasts for its session, through each later turn and sender. A value for this workspace lasts until the workspace is archived. A deleted secret ends each of its grants.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'capabilities' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'mac-access-off',
      title: 'Mac access off',
      description:
        'A member turned Mac access off. The switch saves at once, and the workspace refuses each later Mac command request of its agents, with a reason, as app/mac-commands/mac-access-off shows.',
      rationale:
        'Mac access is off by default (secrets decision 18 A), and every member changes it after the create (secrets decision 8 B). A waiting request of the workspace ends with the same reason, and a running command runs to its end.',
      props: { composer: 'capabilities-mac-off' },
    },
    {
      slug: 'menu',
      title: 'The menu of a phone',
      description:
        'On a phone, the bar of the composer holds one + button in place of the paperclip and the Capabilities icon. Its menu opens above it with Attach files and Capabilities. Capabilities opens the control as a sheet, and Attach files opens the file picker. A computer keeps the paperclip and the Capabilities icon in the bar, so its view shows the composer as it is.',
      rationale:
        'Secrets decision 16 G: on a phone, Stop shows only its icon, and Attach files and Capabilities move into one menu. Only this keeps the model and the login label readable at 360 px. Attaching a file takes two taps, and the menu gives later tools of the composer a place on a phone.',
      props: { composer: 'menu' },
    },
  ],
})
