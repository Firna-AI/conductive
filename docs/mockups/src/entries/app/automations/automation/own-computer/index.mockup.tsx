import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const automationComputer = defineScreen({
  title: 'Computer of the runs',
  description:
    'The automation that reviews pull requests, as Cal, its owner, sees it in Acme, which has own computers. Computer follows Section, with the choice of New workspace set to build-01, and the hint under the fields says that each run opens a new workspace on this computer. The variants show the open menu, the view of a member, and the automation after an admin removed its own computer.',
  rationale:
    'Cal chose option A of own computer decision 3 on 22 November 2026: each automation has its own choice of a computer, with the cloud computer as the default. A run then starts on that computer, as a workspace that a member creates. Only the owner changes an automation (decision 502), so only the owner gets the choice.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, computer: 'own' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'menu',
      title: 'Computer menu',
      description:
        'Cal pressed the choice. Its menu is the menu of New workspace: Cloud computer, then the own computers of Acme with their states, and build-01 checked. A phone opens it as a sheet.',
      rationale:
        'One menu for every place that chooses a computer, so a member learns it once.',
      props: { computerMenu: 'open' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, reads the automation of Cal. The facts name build-01 as its Computer, after its Section.',
      rationale:
        'Every member sees the automation and its runs, and only its owner changes it (decision 502).',
      props: { viewer: 'member' },
    },
    {
      slug: 'computer-removed',
      title: 'Computer removed',
      description:
        'An admin removed old-runner, the own computer of the runs, so the automation turned off. A notice says so, and asks Cal to choose another computer, then turn it on. Priya reads that only Cal can choose another one.',
      rationale:
        'A removed computer cannot run the next run, and a silent move to the cloud computer would run the work in another place than its owner chose. So the automation turns off, as it does when an admin removes its repository from the chosen repositories.',
      props: { computer: 'removed' },
    },
  ],
})
