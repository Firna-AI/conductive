import { defineScreen } from '@mokly/mokly'
import { OperatorCodesScreen } from '../../../../../screens/OperatorCodesScreen'
import { OperatorScreen } from '../../../../../screens/OperatorScreen'
import { OperatorWaitlistScreen } from '../../../../../screens/OperatorWaitlistScreen'

const waitlistOffSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'dialog', 'waitlist', 'signUps'],
  properties: {
    /** The tab that shows: Invite codes, Waitlist, or Overview. */
    tab: { enum: ['codes', 'waitlist', 'overview'] },
    /** The question before Turn off the waitlist, over the Invite codes tab. */
    dialog: { enum: ['none', 'turn-off-waitlist'] },
    /** The waitlist is on, or an operator turned it off. */
    waitlist: { enum: ['on', 'off'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
  },
} as const

export const operatorCodesWaitlistOff = defineScreen({
  title: 'Turn off the waitlist',
  description:
    'Turn off the waitlist in the Sign-ups box asks first. The question says that each new sign-in gets app access at once. It gives the number of people who wait, 38, and says that each of them gets app access at their next visit, with no email. It also says that nobody loses app access when the waitlist turns on again.',
  rationale:
    'The user chose option A of decision 230 on 9 November 2026: a switch beside Pause sign-ups lets every new person in. Each grant of open sign-up is final, so Turn off asks first. Turn on brings back the usual state, so it acts at once, as Resume sign-ups does. A person who waits gets app access at their next request, while they are at the app, so no email goes out. The plan keeps no cap and no end time.',
  relatedDocs: [],
  propSchema: waitlistOffSchema,
  props: {
    tab: 'codes',
    dialog: 'turn-off-waitlist',
    waitlist: 'on',
    signUps: 'open',
  },
  render: (props, context) => {
    const { tab, dialog, waitlist, signUps } = props
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
      slug: 'turned-off',
      title: 'Waitlist off',
      description:
        'While the waitlist is off, the notice at the top of the tab names the operator and the time, says that each new sign-in gets app access at once and that people on the waitlist get it at their next visit, and has Turn on the waitlist. The Sign-ups box below it says Open, with Pause sign-ups.',
      rationale:
        'The notice holds Turn on the waitlist, as the notice of the pause holds Resume sign-ups. The box says Open only now, during open sign-up, so Open never reads as open sign-up while new people wait. The pause stays an emergency stop in both states of the switch.',
      props: { dialog: 'none', waitlist: 'off' },
    },
    {
      slug: 'waitlist',
      title: 'Waitlist off, on the Waitlist tab',
      description:
        'The same notice tops each tab of the section while the waitlist is off, here the Waitlist. The people who wait stay in the list until their next visit, and Approve still works.',
      props: { tab: 'waitlist', dialog: 'none', waitlist: 'off' },
    },
    {
      slug: 'overview',
      title: 'Waitlist off, on the Overview',
      description:
        'The notice also tops the Overview, so the operator sees the open sign-up first when the section opens.',
      props: { tab: 'overview', dialog: 'none', waitlist: 'off' },
    },
    {
      slug: 'paused',
      title: 'Waitlist off while sign-ups are paused',
      description:
        'The operator turned off the waitlist, then paused sign-ups. Both notices show, the notice of the pause first. The notice of the switch says that each new sign-in gets app access when sign-ups resume. The Sign-ups box does not show, because each notice holds its own action.',
      rationale:
        'The pause wins over the switch, so its notice comes first and decides who gets in. Resume sign-ups returns to open sign-up, and Turn on the waitlist keeps the pause on.',
      props: { dialog: 'none', waitlist: 'off', signUps: 'paused' },
    },
  ],
})
