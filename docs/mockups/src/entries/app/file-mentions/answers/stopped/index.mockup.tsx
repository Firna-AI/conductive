import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const fileMentionAnswersStopped = defineScreen({
  title: 'Stopped cloud computer',
  description:
    'The cloud computer of the workspace stopped, so its bar takes the place of the message box. The chat reads no picture while the cloud computer does not run. So the Markdown image of the screenshot shows as the link Postcode field on a phone, with the path as its title. A press on the link opens the file tab. The same link shows while the cloud computer starts, and when a read fails, the file passes the read limit, or the browser cannot draw its bytes.',
  rationale:
    'A design call of 18 November 2026: the chat never starts or resumes a cloud computer for a picture, because a resume that the member did not ask for costs money. The link still opens the file tab, which gives the reason when the file does not open.',
  relatedDocs: ['docs/protocol/stop-and-resume.md'],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'file-answer', sandbox: 'stopped' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
