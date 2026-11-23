import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatWakeUps = defineScreen({
  title: 'Wake-ups',
  description:
    'Cal asked the agent of Address autocomplete to check the checks of pull request #482 the next morning. The agent set a wake-up with a workspace tool and ended its reply, so the session waits with no turn, and its cloud computer can stop. A card above the composer shows the pending wake-up: the alarm icon, "Wake-up tomorrow at 09:00" in the local time of Cal, Cancel, and two lines of the text that the agent set, which its turn gets at that time. The card waits for no member, so the workspace shows no Needs input. Cancel leads to app/chat/wake-ups/cancelled. On a phone the card has the same parts, and Cancel is 40 px high.',
  rationale:
    'Cal chose B of wake-up decision 1 on 22 November 2026, then D on 23 November 2026: the Worker keeps each wake-up, so the turn that sets it can end and the cloud computer can stop. Wake-up decision 3 B shows each pending wake-up in its session, with its time, its text, and a Cancel for each member. The card stays in view above the composer, as a request that waits does, because a wake-up can be days away, and a member must see it whatever the scroll. It has its own group, above the requests, because it waits for no answer. Its time is in the local time of the reader, because the agent and the Worker know only UTC.',
  relatedDocs: [
    'docs/protocol/background-work.md',
    'docs/protocol/session-watches.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'wake-up-pending',
    banner: 'none',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
