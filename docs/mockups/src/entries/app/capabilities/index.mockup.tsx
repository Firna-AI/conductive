import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const capabilities = defineScreen({
  title: 'Capabilities of a workspace',
  description:
    'Cal pressed the Capabilities icon beside the paperclip in Checkout address autocomplete. The control opens above the icon, with the parts of New workspace. Secrets lists each secret of Acme with its checkbox: FIGMA_TOKEN is pre-approved, and SENTRY_AUTH_TOKEN is for all agents. Allowed in sessions lists each approval with its session, who allowed it, and when. Values for this workspace lists the value of MAPBOX_TOKEN that Priya gave. Each approval and each value has Remove. Mac access is on. On a phone the control opens as a sheet.',
  rationale:
    'Secrets decision 8 B: the same Capabilities icon shows in each workspace, beside the message box. Every member sees and changes the pre-approved secrets and Mac access there, and removes the approvals of the sessions and each value for this workspace. It meets "edited from workspace settings", it gives the undo of a wrong grant, and it keeps each capability in one place. An approval belongs to its secret and lasts for its session, through each later turn and sender. A value for this workspace lasts until the workspace is archived. A deleted secret ends each of its grants.',
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
        'Mac access is on by default (secrets decision 9 A), and every member changes it after the create (secrets decision 8 B). A waiting request of the workspace ends with the same reason, and a running command runs to its end.',
      props: { composer: 'capabilities-mac-off' },
    },
  ],
})
