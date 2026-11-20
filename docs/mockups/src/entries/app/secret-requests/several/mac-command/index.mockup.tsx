import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const macCommandStack = defineScreen({
  title: 'A Mac command and a secret request',
  description:
    'Nobody answered PROD_DATABASE_URL in time, so its request turned late when its turn ended. Then Cal asked for the checkout test in Safari, and the agent asked to run it on his Mac. Both requests wait in the stack above the composer. The command on the Mac is on top, because its call waits: the command, the Mac, the time limit, and its state, with no choices, because only the Mac app can allow a command on the Mac. "1 of 2" with Previous and Next sits above it, and the edge of the late request shows behind it. Next shows the late request, with its choices.',
  rationale:
    'A design call of 20 November 2026: commands on a Mac take their place in the stack, in the same order as the requests for secrets, but they never hide another request, because each Allow runs one exact command. The Mac app draws the same stack with Deny and Allow on the command, as the with-secret state of mac-app/requests shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'mac-waiting-secret' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'next',
      title: 'The late request behind it',
      description:
        'After Next, the late request for PROD_DATABASE_URL is on top, with Deny, Allow for this session, and its late line. The place says "2 of 2", Next is off, and the edge of the command on the Mac shows behind it.',
      props: { shownRequest: 2 },
    },
  ],
})
