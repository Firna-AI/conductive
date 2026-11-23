import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const accountDeletion = defineScreen({
  title: 'Request account deletion',
  description:
    'The General tab ends with Delete account. It says that the person asks Conductive to delete the account, and that a deletion cannot be undone. Request account deletion, in the danger tone, opens the question. The section comes after the invite code, and after Deleted orgs while the person has a deleted org. Every account has the section, so each page of General shows it, as app/account does. This page holds the states of the request. The phone apps show the same page as a phone browser.',
  rationale:
    'The user chose option A of decision 4 of the universal Expo app plan on 23 November 2026: the Account page gets Request account deletion, and operators complete each request. The phone apps need it for the rules of the stores, as that plan says. The section comes last, as Delete org comes last on the General tab of an org, because it is the one action that ends the account. The words say what the request does. They leave open what the plan leaves open: when the deletion happens, whether a person can withdraw a request, what happens to the orgs and the workspaces of the person, whether the account works until the deletion, and which email goes out. The words name the product, not an operator, as the other words of the account do.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountGeneral,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'confirm',
      title: 'Confirm the request',
      description:
        'Request account deletion asks first. The question names the account, @calummoore, and says that Conductive deletes it after the request, and that nobody can undo the deletion. Cancel closes the question, and Request deletion sends the request. On desktop the question is a dialog over the dimmed app, and on a phone it is a sheet.',
      rationale:
        'A deletion cannot be undone, so the app asks first with ConfirmDialog, as the design says. The question asks for no typed name, as Delete org does, because the request is not the deletion: an operator completes it. The title gives the whole words of decision 4 A. The confirming action says Request deletion, so that it fits half of the sheet on a phone.',
      props: { deletion: 'confirm' },
    },
    {
      slug: 'sending',
      title: 'Sending',
      description:
        'The person pressed Request deletion, and the request runs. A spinner leads Request deletion, and Cancel is off. Escape and a press outside do nothing. On a phone the sheet stays open in the same way. When the request is done, the section after the request shows.',
      rationale:
        'A question that runs its own action stays open while the action runs, as app/orgs/suspended/leave/leaving shows. So the error of a failed request shows in the question.',
      props: { deletion: 'sending' },
    },
    {
      slug: 'failed',
      title: 'Request not sent',
      description:
        'The request did not reach the server. The question stays open, with a danger notice under its text: the title says that the request was not sent, and the body gives the message of the server. Cancel and Request deletion are on, so the person can try again.',
      rationale:
        'The error stays with the action that it is about, as in the dialog of New section. Nothing changed, so a Cancel shows the section with its button again.',
      props: { deletion: 'failed' },
    },
    {
      slug: 'requested',
      title: 'Requested',
      description:
        'After the request, the section says Requested beside its title, with an hourglass. In place of the button, a line gives the day of the request. A later visit to the page shows the same section.',
      rationale:
        'The section says only what happened and when, so its words hold under each open question of the plan. It offers no way to withdraw the request, because the plan has not decided whether a person can do that. The line is a status line, so a screen reader reads it when it shows.',
      props: { deletion: 'requested' },
    },
  ],
})
