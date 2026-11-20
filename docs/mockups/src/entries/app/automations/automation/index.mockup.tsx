import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../screens/automationState'

export const automation = defineScreen({
  title: 'Automation',
  description:
    "Cal's automation that reviews pull requests, as Cal sees it: the name, the Active switch, the repository, the section of the run workspaces, and By Cal. Then the triggers, PR opened and PR pushed, and the prompt with the Capabilities icon and the model picker inside its box. Under the box, one line names the logins of the runs, one says that runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question, and a hint says that text in a pull request can steer the agent to use these secrets. Delete and Save sit in the header, and the Runs list fills the column at the right. The automation has only pull request triggers, so it has no Run now. A phone shows the automation in two tabs, Automation and Runs, with Save at the bottom and Delete at the end of the form.",
  rationale:
    'Each run uses the GitHub access of the owner of the automation, and the default agent login of the owner: their own login, or the org login, from decision 5 A of the org logins plan of 16 November 2026. So the line under the prompt names them, as app/automations/automation/new/org-login shows for the org login. Only the owner changes the automation, turns it on, and uses Run now, as the user chose in decision 502 B. Run now does not show on an automation whose triggers are all pull request triggers, because such a run needs a pull request, as the user chose in decision 510 C. A run workspace is a normal workspace in the section that the automation chooses, from decision 504 A. Each run workspace starts with the secrets that the owner chose as pre-approvals, from automation capabilities decision 1 A, and the Capabilities icon opens their control, as app/automations/automation/capabilities shows. Save stays off until something changes. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: ownerAutomation,
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
