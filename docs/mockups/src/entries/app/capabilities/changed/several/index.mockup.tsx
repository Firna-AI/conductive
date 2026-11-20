import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const capabilitiesChangedSeveral = defineScreen({
  title: 'Several changes in one edit',
  description:
    'One edit of Priya pre-approved VERCEL_TOKEN, removed the approval of PROD_DATABASE_URL in Address autocomplete, and turned Mac access off. This session gets one note with each change, in one sentence: "Priya Raman pre-approved VERCEL_TOKEN, removed the approval of PROD_DATABASE_URL for this session, and turned Mac access off." The other session gets only "Priya Raman turned Mac access off.", because its approval of VERCEL_TOKEN covers the pre-approval, and the removed approval was not its own.',
  rationale:
    'One write gives one note. The Worker takes the facts of each session before and after the write, and sends each session only its own difference. The note lists the changes in a fixed order, with Mac access last, so that the rules of Mac access on follow it.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'capabilities-changed-several' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
