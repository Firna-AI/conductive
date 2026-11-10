import { defineScreen } from '@mokly/mokly'
import { OperatorCodesScreen } from '../../../../../screens/OperatorCodesScreen'
import { OperatorScreen } from '../../../../../screens/OperatorScreen'
import { OperatorWaitlistScreen } from '../../../../../screens/OperatorWaitlistScreen'

const pauseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'dialog', 'signUps', 'waitlist'],
  properties: {
    /** The tab that shows: Invite codes, Waitlist, or Overview. */
    tab: { enum: ['codes', 'waitlist', 'overview'] },
    /** The question before the pause, over the Invite codes tab. */
    dialog: { enum: ['none', 'pause'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
    /** The waitlist is on, or an operator turned it off. */
    waitlist: { enum: ['on', 'off'] },
  },
} as const

export const operatorCodesPause = defineScreen({
  title: 'Pause sign-ups',
  description:
    'Pause sign-ups asks first. The question says that invite codes, referral codes, and org invitations let nobody in until sign-ups resume, and that each code keeps its uses. It also says that new people wait, also while the waitlist is off, and that Approve still works. The waitlist is on here, as the Sign-ups box behind the question says.',
  rationale:
    'The user asked on 8 November 2026 for a way to block all invite codes, to stop all sign-ups for a time, in decision 160. The pause stops every way in except the approval of an operator, which is one deliberate act. A code that the pause stopped stays unused, so nobody loses a code. The pause also wins over the waitlist switch of decision 230, so the question says that it stops open sign-up too. The screen of a person who waits never names the switch.',
  relatedDocs: [],
  propSchema: pauseSchema,
  props: { tab: 'codes', dialog: 'pause', signUps: 'open', waitlist: 'on' },
  render: (props, context) => {
    const { tab, dialog, signUps, waitlist } = props
    switch (tab) {
      case 'codes':
        return (
          <OperatorCodesScreen
            state={{ list: 'newest', dialog, signUps, waitlist }}
            viewport={context.viewport}
          />
        )
      case 'waitlist':
        return (
          <OperatorWaitlistScreen
            state={{ list: 'oldest', dialog: 'none', signUps, waitlist }}
            viewport={context.viewport}
          />
        )
      case 'overview':
        return (
          <OperatorScreen
            state={{ numbers: 'ready', signUps, waitlist }}
            viewport={context.viewport}
          />
        )
    }
  },
  variants: [
    {
      slug: 'paused',
      title: 'Sign-ups paused',
      description:
        'While the pause is on, the notice at the top of the tab names the operator and the time, says what lets nobody in, says that new people wait also while the waitlist is off, and has Resume sign-ups. It takes the place of the whole Sign-ups box, so Turn off the waitlist does not show until sign-ups resume. New code still works.',
      rationale:
        'Resume sign-ups needs no question, because it brings back the usual state, and Pause sign-ups can turn the pause on again at once. Resume returns to the state of the waitlist switch.',
      props: { dialog: 'none', signUps: 'paused' },
    },
    {
      slug: 'waitlist',
      title: 'Paused, on the Waitlist',
      description:
        'The same notice tops each tab of the section while the pause is on, here the Waitlist. Approve still works.',
      props: { tab: 'waitlist', dialog: 'none', signUps: 'paused' },
    },
    {
      slug: 'overview',
      title: 'Paused, on the Overview',
      description:
        'The notice also tops the Overview, so the operator sees the pause first when the section opens.',
      props: { tab: 'overview', dialog: 'none', signUps: 'paused' },
    },
    {
      slug: 'waitlist-off',
      title: 'Pause sign-ups while the waitlist is off',
      description:
        'The same question during open sign-up. Behind it, the notice of the switch and the Sign-ups box that says Open stay. Cancel goes back to that tab. Pause sign-ups leads to the tab with both notices, the notice of the pause first.',
      rationale:
        'The pause and the waitlist switch are separate controls, so the pause keeps the state of the switch, and open sign-up starts again when sign-ups resume. The question keeps its words, because they already say that new people wait also while the waitlist is off.',
      props: { waitlist: 'off' },
    },
  ],
})
