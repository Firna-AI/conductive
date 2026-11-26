import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'The small Capabilities icon beside the attach button shows its label on hover, and a press opens the control above it. In a browser, the control has one part, Secrets. Secrets has no hint line. It lists each secret of Acme with a checkbox and an info icon after its name, and Cal pre-approved FIGMA_TOKEN for the new workspace. The description shows only in the info box of the icon, as the info variant shows. SENTRY_AUTH_TOKEN is marked for all agents, so it stays checked, off, with the words "All agents". Manage secrets opens the Secrets tab of the org settings. A browser shows no Mac access part, because only the Mac app can allow all commands on its Mac, as mac-app/new-workspace shows. The page shows nothing more, so the draft keeps its room. On a phone, Capabilities in the menu of the + button opens the control as a sheet, as the menu variant shows.',
  rationale:
    "Secrets decision 6, Cal's option G: a small icon with its label on hover keeps the page and the dialog uncluttered, and gives later features, such as MCP servers, one place. So the control is a list of parts, and a later part takes its place in the list. New workspace gets no separate secret picker. An agent of the new workspace uses a pre-approved secret with no question, through each later turn, also after Continue. Any member who creates a workspace can pre-approve any secret. Mac access decision 7 (21 November 2026): the switch of Mac access is personal, and only the Mac app shows it. There, turning it on allows all commands of the new workspace on the Mac of the creator, as mac-app/new-workspace shows. The icon is the Blocks icon of lucide, as building blocks that the agents get.",
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
        'Firna, a new org, has no secrets yet. The Secrets part says so and offers Add a secret, which opens the Secrets tab of Firna.',
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
      slug: 'info',
      title: 'The description of a secret',
      description:
        'Cal pressed the info icon after PROD_DATABASE_URL. Its info box opens under the icon, over the rows below it, with the description "Read-only replica of the production database." The row itself shows no description. A second press closes the box. On a computer, the mouse on the icon also opens it. STAGING_API_KEY has no description, so it shows no icon, because the box would be empty.',
      rationale:
        'Cal chose on 20 November 2026 to hide the descriptions behind an info icon, and to remove the hint "Agents use a pre-approved secret with no question." A row then shows one line, so more secrets fit in the small card. Cal then chose that the description shows only in the info box, not as a line in the row. A press also works on a phone, where no mouse hovers. The box stays inside the card, because a press outside the card closes it.',
      props: { capabilities: 'info' },
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
