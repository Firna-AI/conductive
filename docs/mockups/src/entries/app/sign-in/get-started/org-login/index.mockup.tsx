import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedOrgLogin = defineScreen({
  title: 'Agent step done with the org login',
  description:
    'Priya accepted an invitation to Acme, and she has no Claude or Codex login of her own. An admin of Acme connected an org login for Claude. So the agent step is done, and its state says "Ready". Its words say that Priya can start now with Acme\'s login, and that she can connect her own at any time in her account. Under Claude, a line says "Your new sessions in Acme use Acme\'s login." Claude and Codex keep Connect, and no form opens. The GitHub App step and the org step are done too, so the finish says that Acme is ready, and Open Acme leads to the workspaces of Acme.',
  rationale:
    'Decision 4 of the org logins plan, which the user stated on 16 November 2026: a member of an org with a usable org login needs no login of their own, so the agent step of Get started is complete. The user chose decision 1 B on the same day: the org login belongs to the org, and an admin connects it on the Agents tab of the org settings. The line names the org login, so Priya knows which login her sessions use. It never shows the kind, the key, or the address, because the Agents tab of the org settings shows the kind and the host to members. The account names the default login of the person for each org and agent, so the step shows that value and does not work out the order (option F of decision 6). Get started shows until each step is done. So Priya sees this state when she finishes her last step on the page, such as the GitHub App, and at her next visit the app opens Acme.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: {
    ...getStartedFirstRun,
    step: 'done',
    agent: 'org',
    person: 'priya',
    firstBuild: 'succeeded',
  },
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})
