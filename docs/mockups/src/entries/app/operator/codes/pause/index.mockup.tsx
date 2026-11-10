import { defineScreen } from '@mokly/mokly'
import { OperatorCodesScreen } from '../../../../../screens/OperatorCodesScreen'
import { OperatorScreen } from '../../../../../screens/OperatorScreen'
import { OperatorWaitlistScreen } from '../../../../../screens/OperatorWaitlistScreen'

const pauseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'dialog', 'signUps'],
  properties: {
    /** The tab that shows: Invite codes, Waitlist, or Overview. */
    tab: { enum: ['codes', 'waitlist', 'overview'] },
    /** The question before the pause, over the Invite codes tab. */
    dialog: { enum: ['none', 'pause'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
  },
} as const

export const operatorCodesPause = defineScreen({
  title: 'Pause sign-ups',
  description:
    'Pause sign-ups asks first. The question says that invite codes, referral codes, and org invitations let nobody in until sign-ups resume, that each code keeps its uses, and that the waitlist stays open and Approve still works.',
  rationale:
    'The user asked on 8 November 2026 for a way to block all invite codes, to stop all sign-ups for a time, in decision 160. The pause stops every way in except the approval of an operator, which is one deliberate act. A code that the pause stopped stays unused, so nobody loses a code.',
  relatedDocs: [],
  propSchema: pauseSchema,
  props: { tab: 'codes', dialog: 'pause', signUps: 'open' },
  render: (props, context) => {
    const { tab, dialog, signUps } = props
    switch (tab) {
      case 'codes':
        return (
          <OperatorCodesScreen
            state={{ list: 'newest', dialog, signUps }}
            viewport={context.viewport}
          />
        )
      case 'waitlist':
        return (
          <OperatorWaitlistScreen
            state={{ list: 'oldest', dialog: 'none', signUps }}
            viewport={context.viewport}
          />
        )
      case 'overview':
        return (
          <OperatorScreen
            state={{ numbers: 'ready', signUps }}
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
        'While the pause is on, the notice at the top of the tab names the operator and the time, says what lets nobody in, and has Resume sign-ups. It takes the place of the Sign-ups box, and New code still works.',
      rationale:
        'Resume sign-ups needs no question, because it brings back the usual state, and Pause sign-ups can turn the pause on again at once.',
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
  ],
})
