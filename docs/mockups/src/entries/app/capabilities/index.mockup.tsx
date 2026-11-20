import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const capabilities = defineScreen({
  title: 'Capabilities of a workspace',
  description:
    'Cal pressed the Capabilities icon beside the paperclip in Checkout address autocomplete. The control opens above the icon, with the parts of New workspace. Secrets lists each secret of Acme with its checkbox: FIGMA_TOKEN is pre-approved, and SENTRY_AUTH_TOKEN is for all agents. Allowed in sessions lists each approval with its session, who allowed it, and when. Values for this workspace lists the value of MAPBOX_TOKEN that Priya gave. Each approval and each value has Remove. Mac access is on, because a member turned it on. On a phone, Capabilities in the menu of the + button opens the control as a sheet, as app/capabilities/menu shows. A change in the control gives a note in the chat of each session whose facts it changes, as app/capabilities/changed shows.',
  rationale:
    'Secrets decision 8 B: the same Capabilities icon shows in each workspace, beside the message box. Every member sees and changes the pre-approved secrets and Mac access there, and removes the approvals of the sessions and each value for this workspace. It meets "edited from workspace settings", it gives the undo of a wrong grant, and it keeps each capability in one place. An approval belongs to its secret and lasts for its session, through each later turn and sender. A value for this workspace lasts until the workspace is archived. A deleted secret ends each of its grants. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'capabilities' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
