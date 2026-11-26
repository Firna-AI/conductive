import { defineScreen } from '@mokly/mokly'
import { ReducedMotion } from '../../../../../components/common/ReducedMotion'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { otherTabWalk } from '../../../../../screens/tabWalks'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const needsInputReducedMotion = defineScreen({
  title: 'With reduced motion',
  description:
    'The screen of the parent page, as a browser shows it when Cal asks for reduced motion. The mark on the tab of Address autocomplete stays blue and still: its middle column stays lit, and its other cells stay dim. The marks of the header and of the workspace list stay still in the same way, and the mark of a workspace whose agent works keeps its ring lit. On a phone, the marks of the tab and of the header stay still too.',
  rationale:
    'The tab takes the list mark, so it takes its still form too: a middle column lit in blue, which keeps the state visible without motion. The browser setting chooses the form, so the app needs no setting of its own.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...otherTabWalk.states.second.props },
  render: (props, context) => (
    <ReducedMotion>
      <WorkspaceScreen state={props} viewport={context.viewport} />
    </ReducedMotion>
  ),
})
