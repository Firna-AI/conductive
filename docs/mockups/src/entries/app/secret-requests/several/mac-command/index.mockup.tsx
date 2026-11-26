import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { macCommandWalk } from '../../../../../screens/stackWalks'
import { placeVariants } from '../../../../../screens/walkPages'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const macCommandStack = defineScreen({
  title: 'A Mac command and a secret request',
  description:
    'Nobody answered PROD_DATABASE_URL in time, so its request turned late when its turn ended. Then Cal asked for the checkout test in Safari, and the agent asked to run it on his Mac. Both requests wait in the stack above the composer. A browser cannot answer a command on a Mac, so the late request is on top, though the call of the command waits: PROD_DATABASE_URL, its description, the reason, the command, Deny, Allow for this session, and its late line. "1 of 2" with Previous and Next sits above it, and the edge of the command shows behind it. Next shows the command on the Mac, with its state only.',
  rationale:
    "Cal chose option B of decision 4 of the needs-input change on 22 November 2026: the cards that this view cannot answer go after the cards that it can answer, and each part keeps the order of the stack. So the card on top is one that the member can answer, whenever such a card exists. Only the Mac app on the Mac that got a command can answer it, so a browser puts the command last. The Mac app on Cal's Mac answers both, so it keeps the order of the stack, with the command first, as mac-app/command-and-secret shows. A design call of 20 November 2026: commands on a Mac take their place in the stack, but they never hide another request, because each Allow runs one exact command. The pages of this stack walk through its places only, so the answers of the late request draw no link, and no answer drops the command.",
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...macCommandWalk.states.start.props },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: placeVariants(macCommandWalk, 'start', [
    {
      title: 'The Mac command behind it',
      description:
        'After Next, the command on Cal\'s MacBook Pro is on top: the command, the Mac, the time limit, Details, and its state, Waiting for approval, with no choices. The place says "2 of 2", Next is off, and the edge of the late request shows behind it.',
    },
  ]),
})
