import { defineScreen } from '@mokly/mokly'
import {
  hexwavePage,
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgSwitchWaiting = defineScreen({
  title: 'Switch that waits',
  description:
    'The operator switched Hexwave to e2b while the build of @vex-ops runs, and did not end that build. The Provider account box gives boat, the account of Hexwave, then e2b with the time and the operator of the switch, and the switch build, which waits for the build of @vex-ops. Hexwave stays on boat, and its new workspaces start there. Stop switch takes the place of Switch account. The workspaces count the build of @vex-ops as a build that runs now.',
  rationale:
    'The user chose switch decision 3 D on 20 November 2026: without the end of the build that runs, the switch waits, and the switch build starts when that build ends. The page of the org shows the waiting switch, as the design of the switch says.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { ...hexwavePage, switch: 'waits-for-build', build: 'running' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'suspended',
      title: 'Switch that waits for Lift',
      description:
        'The operator switched Hexwave while it is suspended. No build runs while the org is suspended, so the switch build waits for Lift. The notice of the suspension stays at the top, and Lift suspension in the header asks first.',
      rationale:
        'A suspended org gets a waiting switch, and Lift starts the switch build, as the design of the switch says. Today Lift starts no build, so Lift needs this change.',
      props: { status: 'suspended', switch: 'waits-for-lift', build: 'none' },
    },
    {
      slug: 'lift',
      title: 'Lift with a switch that waits',
      description:
        'The question of Lift suspension adds that Lift also starts the switch build on e2b. After the lift, the switch build runs.',
      props: {
        status: 'suspended',
        switch: 'waits-for-lift',
        build: 'none',
        dialog: 'lift',
      },
    },
    {
      slug: 'no-admin',
      title: 'Switch that waits for an admin',
      description:
        'An operator suspended @vex-ops, the only admin of Hexwave, so the org has no admin who is not suspended. The switch build runs for such an admin, as an automatic refresh does, so it waits until Hexwave has one. The members list shows @vex-ops as suspended.',
      rationale:
        'The switch build starts as the first active admin of the org, and an org with no active admin gets a waiting switch, as the design of the switch says. The image timer starts the switch build when an admin is active again.',
      props: { switch: 'waits-for-admin', build: 'none' },
    },
  ],
})
