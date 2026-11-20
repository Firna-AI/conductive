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
    "Secrets decision 6, Cal's option G: a small icon with its label on hover keeps the page and the dialog uncluttered, and gives later features, such as MCP servers, one place. So the control is a list of parts, and a later part takes its place in the list. New workspace gets no separate secret picker. An agent of the new workspace uses a pre-approved secret with no question, through each later turn, also after Continue. Any member who creates a workspace can pre-approve any secret. Mac access is off by default in each new workspace (secrets decision 18 A), so agents reach a Mac only after a member chooses it. The Mac app still asks before each command. The icon is the Blocks icon of lucide, as building blocks that the agents get.",
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
      slug: 'search',
      title: 'A search of many secrets',
      description:
        'Acme has twelve secrets, so a Search secrets field shows above the list. Cal typed "deploy". The list keeps VERCEL_TOKEN, FLY_API_TOKEN, and NETLIFY_TOKEN, whose descriptions hold the word, in the order of the full list. A search that matches no secret says so in a line. Clearing the field shows every secret again. Each check stays as it was while the search hides its secret. An org with ten secrets or fewer gets no search field, as the first state shows.',
      rationale:
        'Cal asked on 20 November 2026 for a search when the list holds more than ten secrets. The control is a small card above the composer, so a long list needs a scroll to find one secret. The search reads the name and the description, because a member often knows what a secret is for and not its name. The search field and the filter are the same as in the repository picker of the org settings.',
      props: { capabilities: 'search' },
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
