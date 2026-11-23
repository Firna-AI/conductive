import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const memberAutomation = defineScreen({
  title: 'Seen by a member',
  description:
    "Priya, a member who is not an admin, reads Cal's automation: its facts, its triggers, its prompt with the model, and its runs, without fields and without actions. One line says that only Cal can change it. Under the prompt, a read-only line says that runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question, and the prompt has no Capabilities icon. The automation has pull request triggers, so the hint follows it: text in a pull request, such as a comment, can steer the agent to use these secrets.",
  rationale:
    "Every member sees each automation, its prompt, and its runs, as the user chose in decision 502 B. A run acts as its owner on GitHub, and it takes the default agent login of its owner, the own login or the org login, from decision 5 A of the org logins plan. So only the owner changes the automation, and the line under the prompt names both logins for each member who reads it. Here the runs use Cal's own Claude login, and the org-login variant shows the runs on the org login. Every member sees the secrets that the runs use with no question, and only the owner changes them, as a design call of 18 November 2026 for automation capabilities says. So Priya reads them, and the hint tells her about the risk too.",
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, viewer: 'member' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'org-login',
      title: 'Runs on the org login',
      description:
        'Cal has no Claude login of his own, so the runs of his automation take the org login of Acme. Priya reads the automation. The line under the prompt says "Runs use Acme\'s Claude login and Cal\'s GitHub access."',
      rationale:
        "The server names the login of the runs in the reply of the automation, from the default login of its owner, as the agent's call of 17 November 2026 after review finding 4 says. So each member who reads the automation sees whose login pays for its runs, and the GitHub access stays the owner's. Only the account of the owner names the default login of the owner, so the page of a reader cannot work it out.",
      props: { login: 'org' },
    },
  ],
})
