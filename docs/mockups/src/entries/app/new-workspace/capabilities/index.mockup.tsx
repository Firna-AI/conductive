import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'The small Capabilities icon beside the attach button shows its label on hover, and a press opens the control above it. The control lists its parts: Secrets, then Mac access. Secrets lists each secret of Acme with its description and a checkbox, and Cal pre-approved FIGMA_TOKEN for the new workspace. SENTRY_AUTH_TOKEN is marked for all agents, so it stays checked, off, with the words "All agents". Manage secrets opens the Secrets tab of the org settings. Mac access is off, and its hint says that agents can ask to run commands on the Mac of the member who sent the message. The page shows nothing more, so the draft keeps its room. On a phone, Capabilities in the menu of the + button opens the control as a sheet, as the menu variant shows.',
  rationale:
    "Secrets decision 6, Cal's option G: a small icon with its label on hover keeps the page and the dialog uncluttered, and gives later features, such as MCP servers, one place. So the control is a list of parts, and a later part takes its place in the list. New workspace gets no separate secret picker. An agent of the new workspace uses a pre-approved secret with no question, through each later turn, also after Continue. Any member who creates a workspace can pre-approve any secret. Mac access is off by default in each new workspace (secrets decision 18 A), so agents reach a Mac only after a member chooses it. In the Mac app, turning it on also allows all commands of the new workspace on the Mac of the creator, as mac-app/new-workspace shows (Mac access decision 1 C). The icon is the Blocks icon of lucide, as building blocks that the agents get.",
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
        'Firna, a new org, has no secrets yet. The Secrets part says so and offers Add a secret, which opens the Secrets tab of Firna. Mac access stays off.',
      props: { org: 'new' },
    },
    {
      slug: 'mac-access-on',
      title: 'Mac access on, in a browser',
      description:
        'Cal turned Mac access on in New workspace, in a browser. A browser cannot allow all commands on a Mac, so in place of the line of the Mac app, a note says to use Allow all commands on this Mac in the Mac app. Without that line, each Mac asks at its first command, where Allow all commands until I stop is one of the choices.',
      rationale:
        'Mac access decision 5 A (20 November 2026): only the page of the Mac app on the Mac that holds the device connection starts a grant. In a browser, the switch saves, and the control gives this note. A start that the Worker relays from a browser was rejected, because a stolen web session could then let agents run every command on the Mac with no question. mac-app/new-workspace draws the line of the Mac app.',
      props: { capabilities: 'mac-access-on' },
    },
    {
      slug: 'menu',
      title: 'The menu of a phone',
      description:
        'On a phone, the + button of the composer opens its menu with Attach files and Capabilities, which opens the control as a sheet. A computer keeps the attach button and the Capabilities icon, so its view shows the page as it is.',
      rationale:
        'Secrets decision 16 G: the composer of New workspace has the same bar as the composer of a workspace.',
      props: { capabilities: 'menu' },
    },
  ],
})
