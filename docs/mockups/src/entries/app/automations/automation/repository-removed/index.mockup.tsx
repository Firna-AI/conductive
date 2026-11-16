import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const repositoryRemovedAutomation = defineScreen({
  title: 'Turned off when its repository was removed',
  description:
    "Cal's automation Test the refund tools, after an admin removed acme/admin-dashboard from the chosen repositories of Acme. The automation turned off. A notice names the repository and tells Cal to choose another one, then turn the automation on. The Repository field still shows acme/admin-dashboard until Cal picks another one, and the Runs list keeps the runs from before.",
  rationale:
    'No run of an automation can succeed in a repository that the org no longer chooses, so the automation turns off before a run fails, and its page says why, as docs/protocol/automations.md requires. The notice names the repository while the org does not choose it, so the owner knows which one to replace. The app keeps the reason until the owner turns the automation on.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: {
    ...ownerAutomation,
    automation: 'refund-tests',
    runs: 'refund-tests',
  },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, reads the same automation. The notice names the repository and says that only Cal can choose another one.',
      props: { viewer: 'member' },
    },
    {
      slug: 'chosen-again',
      title: 'Repository chosen again',
      description:
        'The same automation after an admin chose acme/admin-dashboard again. The automation stays off. The notice says that its repository stopped being a chosen repository of Acme, and that it stays off until Cal turns it on.',
      rationale:
        'The words are in the past tense and name no repository. The page cannot tell a repository that an admin chose again from another repository that Cal saved in its place, so the same words must be true after either one. Cal turns the automation on when it should run again.',
      props: { automation: 'refund-tests-again' },
    },
    {
      slug: 'chosen-again-member',
      title: 'Repository chosen again, seen by a member',
      description:
        'Priya reads the automation after an admin chose acme/admin-dashboard again. The notice says that its repository stopped being a chosen repository of Acme, and that only Cal can turn it on again.',
      props: { automation: 'refund-tests-again', viewer: 'member' },
    },
  ],
})
