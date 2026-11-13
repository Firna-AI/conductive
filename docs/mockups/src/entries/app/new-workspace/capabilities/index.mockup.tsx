import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'The small Capabilities icon beside the attach button shows its label on hover, and a press opens the control above it. The control lists its parts: Secrets, then Mac access. Secrets lists each secret of Acme with its description and a checkbox, and Cal pre-approved FIGMA_TOKEN for the new workspace. SENTRY_AUTH_TOKEN is marked for all agents, so it stays checked, off, with the words "All agents". Manage secrets opens the Secrets tab of the org settings. Mac access is on, and its hint says that agents can ask to run commands on the Mac of the member who sent the message. The page shows nothing more, so the draft keeps its room. On a phone the control opens as a sheet.',
  rationale:
    "Secrets decision 6, Cal's option G: a small icon with its label on hover keeps the page and the dialog uncluttered, and gives later features, such as MCP servers, one place. So the control is a list of parts, and a later part takes its place in the list. New workspace gets no separate secret picker. An agent of the new workspace uses a pre-approved secret with no question, through each later turn, also after Continue. Any member who creates a workspace can pre-approve any secret. Mac access is on by default (secrets decision 9 A), because the Mac app still asks before each command. The icon is the Blocks icon of lucide, as building blocks that the agents get.",
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, capabilities: 'open' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'no-secrets',
      title: 'An org without secrets',
      description:
        'Firna, a new org, has no secrets yet. The Secrets part says so and offers Add a secret, which opens the Secrets tab of Firna. Mac access stays on.',
      props: { org: 'new' },
    },
  ],
})
