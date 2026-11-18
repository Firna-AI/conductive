import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const fileMentionAnswersLoading = defineScreen({
  title: 'Picture that loads',
  description:
    'The chat reads the screenshot with the file read of the file tab, and the read still runs. The size of the picture is not known yet, so a box takes the most room that a picture takes: the width of the answer and a height of 240 px. The box shows the label, Postcode field on a phone, beside the icon of a picture, and its title is the path. A press on the box opens the file tab, as a press on the picture does. When the read ends, the picture takes the place of the box. A read starts only when the picture comes near the view, and at most two reads run at one time, so each picture that waits shows its box.',
  rationale:
    'Design calls of 18 November 2026. The picture reads the file through the file read of the file tab, so it adds no route, no event field, and no storage. The size of a picture is known only after its read, so the box cannot have the final size. Most screenshots of a phone or a desktop fill the height of 240 px, so the answer moves little when the picture comes. The icon of a picture says what comes in place of the box.',
  relatedDocs: ['docs/protocol/file-mentions-answers.md'],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'file-answer',
    pictures: 'loading',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
