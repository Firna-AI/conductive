import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserDeletion = defineScreen({
  title: 'Deletion requested',
  description:
    'The page of Kai Tanaka, @kt-null, after he requested the deletion of his account, as his row on the Deletions tab opens it. A notice at the top gives the day of the request, 7 Nov. The rest is his page: his email address, his GitHub account, his workspaces, his app access by an invitation to Hexwave, his referral code, and Hexwave, where he is a member.',
  rationale:
    'The page gives the operator what a check of the person needs, in one place: the email address, which the list leaves out, the workspaces that the person owns, and the orgs with their roles. Each person on the Deletions tab has their own page, from the same record as their row, so the person and the day stay the same from the list to the page. The notice offers no action, because the plan has not decided how an operator completes a request. Suspend user stays in the header, because a request changes nothing else of the account.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'deletionKai', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'noor-a',
      title: 'Noor Aziz',
      description:
        'The page of Noor Aziz, @noor-a, after her request of 8 Nov, as her row opens it. She got app access by open sign-up after she waited, and she has no org and no workspace yet, so the page has no Orgs section.',
      props: { page: 'deletionNoor' },
    },
    {
      slug: 'rho-9',
      title: 'Rhea Okafor',
      description:
        'The page of Rhea Okafor, @rho-9, after her request of 8 Nov, as her row opens it. She came in with the invite code Launch week, and she is the only member of Rhino Data, her own org.',
      props: { page: 'deletionRhea' },
    },
  ],
})
