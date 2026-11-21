import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const capabilities = defineScreen({
  title: 'Capabilities of a workspace',
  description:
    'Cal pressed the Capabilities icon beside the paperclip in Checkout address autocomplete. The control opens above the icon, with the parts of New workspace. Secrets lists each secret of Acme with its checkbox: FIGMA_TOKEN is pre-approved, and SENTRY_AUTH_TOKEN is for all agents. This session lists each approval of the open session with who allowed it and when: PROD_DATABASE_URL, which Cal allowed. It hides the approval of FIGMA_TOKEN, because the workspace pre-approves that secret, and the approval of VERCEL_TOKEN, which belongs to another session. Values for this workspace lists the value of MAPBOX_TOKEN that Priya gave. Each approval and each value has Remove. Mac access is on, because a member turned it on. On a phone, Capabilities in the menu of the + button opens the control as a sheet, as app/capabilities/menu shows. A change in the control gives a note in the chat of each session whose facts it changes, as app/capabilities/changed shows.',
  rationale:
    'Secrets decision 8 B: the same Capabilities icon shows in each workspace, beside the message box. Every member sees and changes the pre-approved secrets and Mac access there, and removes the approvals of the session and each value for this workspace. The control shows only the approvals of the session that it opens from, because an approval covers that session only. It hides an approval whose secret the workspace already allows, because that approval adds nothing. It meets "edited from workspace settings", it gives the undo of a wrong grant, and it keeps each capability in one place. An approval belongs to its secret and lasts for its session, through each later turn and sender. A value for this workspace lasts until the workspace is archived. A deleted secret ends each of its grants. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'capabilities' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
