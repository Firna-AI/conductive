import { defineScreen } from '@mokly/mokly'
import {
  OperatorCodesScreen,
  operatorCodesSchema,
} from '../../../../../screens/OperatorCodesScreen'

export const operatorCodesSearch = defineScreen({
  title: 'Search codes',
  description:
    'The search finds a code by its text, an invite code by its label, and a referral code by the GitHub login of its owner. Here the text of a code finds the invite code Launch week, with who made it, its uses, and its state.',
  rationale:
    'A report of misuse often names only a code, so the search takes the text of any code. An operator also remembers a label or a person, so it takes those too. The page of a user who came in with an invite code links here.',
  relatedDocs: [],
  propSchema: operatorCodesSchema,
  props: { list: 'invite', dialog: 'none', signUps: 'open' },
  render: (props, context) => (
    <OperatorCodesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'referral',
      title: 'Find a referral code',
      description:
        'The text of a referral code finds the code of a user. Its row says that it is a referral code and names its owner, whose login opens the page of that user. That page lists who used the code. A search for the login dana-k finds the same row.',
      props: { list: 'referral' },
    },
    {
      slug: 'none',
      title: 'No match',
      description:
        'A search that finds no code says so, and the line above says what the search takes.',
      props: { list: 'none' },
    },
  ],
})
