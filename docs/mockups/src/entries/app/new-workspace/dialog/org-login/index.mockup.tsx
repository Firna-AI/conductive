import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogOrgLogin = defineScreen({
  title: 'Org login',
  description:
    'Priya, a member of Acme, has no Claude login of her own. An admin of Acme connected an org login for Claude. Priya writes the task of a new workspace for Opus 5.5. The dialog shows no notice that asks to connect Claude, and Create is on. After the model picker, the footer says "Acme\'s login", so Priya sees that the first message runs on the org login. A phone shows the New workspace page in the same state, with the same label in the bar of its composer.',
  rationale:
    'Decision 4 of the org logins plan, which the user stated on 16 November 2026: a member of an org with a usable org login needs no login of their own, so the New workspace form shows no Connect notice and refuses no message for a missing login. Decision 6 A: the own login of a member comes first, and the org login serves otherwise. The account names the default login for each org and agent, so the form shows the login that the server names (option F). The form names the org login with the name of the org, as the composer does, from the design calls of that plan. Compare app/new-workspace/dialog/no-login, where no login serves the person.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: {
    ...emptyDialog,
    draft: 'message',
    login: 'org',
    viewer: 'member',
  },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'every-member',
      title: 'Org login for every member',
      description:
        'Cal has a Claude login of his own. An admin of Acme turned on "Use for every member" under the Claude login of Acme. Cal writes the task of a new workspace, and the footer says "Acme\'s login" after the model picker, as for Priya. The first message of the new workspace runs on the org login, not on the own login of Cal.',
      rationale:
        'The user chose decision 7 B of the org logins plan on 16 November 2026: while the switch is on, each new session in the org takes the org login, also for a member with a login of their own. While the org login cannot be used, the own login serves, and the label goes away. Older sessions keep their login. The label tells Cal before Create which login the new workspace uses.',
      props: { viewer: 'admin' },
    },
  ],
})
