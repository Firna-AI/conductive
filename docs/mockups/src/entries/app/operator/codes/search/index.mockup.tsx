import { defineScreen } from '@mokly/mokly'
import {
  OperatorCodesScreen,
  operatorCodesSchema,
} from '../../../../../screens/OperatorCodesScreen'

export const operatorCodesSearch = defineScreen({
  title: 'Search codes',
  description:
    'The search finds any code by its text. Here it finds the invite code Launch week, with who made it, its uses, and its state.',
  rationale:
    'A report of misuse often names only a code, so the search takes the text of any code. The page of a user who came in with an invite code links here.',
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
        'The search also finds the referral code of a user. Its row says that it is a referral code and names its owner, whose login opens the page of that user. That page lists who used the code.',
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
