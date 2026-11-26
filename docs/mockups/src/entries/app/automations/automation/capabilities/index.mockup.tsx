import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const automationCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'Cal pressed the Capabilities icon of his automation that reviews pull requests. The icon sits in the bar of the prompt box, before the model picker, and the control opens above it. Its line says "What agents in each run can use." Its only part is Secrets: each secret of Acme with a checkbox and an info icon, which shows its description. FIGMA_TOKEN and VERCEL_TOKEN are checked, so each run workspace starts with them pre-approved. SENTRY_AUTH_TOKEN is for all agents, so it stays checked and off, with the words "All agents". Manage secrets opens the Secrets tab of the org settings. Under the prompt box, a line says that runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question. The automation has pull request triggers, so a hint follows it: text in a pull request, such as a comment, can steer the agent to use these secrets. A check changes the form, so Save turns on, and Save keeps the secrets with the rest of the automation. On a phone, the icon stays in the bar, and a press opens the control as a sheet.',
  rationale:
    'Cal chose A of automation capabilities decision 1 on 18 November 2026: each run copies the chosen secrets into its run workspace as normal pre-approvals, so a run that needs one of them does not wait for a member. Members can remove each of them in a run workspace, as each pre-approval. Decision 2 A keeps Mac access out of automations, so the control has no Mac access part, and run workspaces keep Mac access off. Decision 3 A keeps one list for each run of the automation. The hint shows while the form has a pull request trigger and a chosen secret, because comments and reviews by other GitHub accounts reach the agent of a pull request run. Secrets decision 6 G keeps one Capabilities control, so the page reuses its icon and its parts. Only the owner changes the secrets, because each run acts as its owner (decision 502 B). The bar holds only the icon and the model picker, so a phone needs no + menu, as a composer does. The line of the secrets shows to every member, so the owner also sees the choice while the control is closed.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, capabilities: 'open' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
