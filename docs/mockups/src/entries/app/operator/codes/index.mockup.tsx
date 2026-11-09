import { defineScreen } from '@mokly/mokly'
import {
  OperatorCodesScreen,
  operatorCodesSchema,
} from '../../../../screens/OperatorCodesScreen'

export const operatorCodes = defineScreen({
  title: 'Invite codes',
  description:
    'The Invite codes tab. Sign-ups at the top say that sign-ups are open, with Pause sign-ups. The search finds a code by its text, an invite code by its label, and a referral code by the GitHub login of its owner. The list gives each invite code, newest first: its label, who made it and the day, the code with Copy, its uses, and its state: Active, Used up, or Disabled. A code that still works also has Copy join link and Disable. New code in the header makes a code. The child pages show New code, Disable, the search, and the pause.',
  rationale:
    'The user asked on 8 November 2026 that the operator makes invite codes with their own use limits, disables them, and blocks every way in for a time, in decision 160. The pause sits on this tab with the codes that it stops. The app makes each code at random from 10 characters without look-alike characters, so that nobody can guess one.',
  relatedDocs: [],
  propSchema: operatorCodesSchema,
  props: { list: 'newest', dialog: 'none', signUps: 'open' },
  render: (props, context) => (
    <OperatorCodesScreen state={props} viewport={context.viewport} />
  ),
})
