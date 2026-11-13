import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/drop-a-file']

export const attachmentsDrop = defineScreen({
  title: 'Drop files',
  description:
    'Cal drags a screenshot from the desktop over the message box. The whole box shows the drop state: a full border in the accent colour. The pointer is over the text after "The screenshot", so the drop caret stands there. A drop on the text puts the files at the drop caret. A drop on the bar or the padding puts them at the caret, or at the end. On a phone, Cal puts the caret after "The screenshot" and presses the paperclip, because a phone has no drag.',
  rationale:
    'The request names the cursor, so a drop goes to the place under the pointer, and a pick from the paperclip goes to the caret (decision 263 A). The box is the drop target, so a drop that misses the text still attaches. While the composer takes no change, such as during a create, the box shows no drop state and takes no drop. A drop of files outside each message box does nothing, so the browser never opens a file in place of the app.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'drop-over' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'dropped',
      title: 'After the drop',
      description:
        'The screenshot is a chip at the place of the drop, and a space follows it. The caret stands after that space, and the field has the focus. The upload starts: before the browser measures it, a spinner and "Uploading" show. On a phone, the picked screenshot stands at the caret in the same way.',
      rationale:
        'A drop and a pick put each file at the same kind of place, so the member learns one rule. The space after the chip lets the member type on at once, as after a pick from the list of `@` (decision 213). The files of one drop go in their order, as one step of undo.',
      props: { composer: 'dropped' },
      useCasePaths: flow,
    },
    {
      slug: 'folder',
      title: 'A folder',
      description:
        'Cal dropped the screenshot and the folder checkout-screens together. The browser zipped the folder, so both are chips at the place of the drop, in the order of the drop: the screenshot, then checkout-screens.zip. Both upload. The zip holds the folder with each file and folder in it.',
      rationale:
        'The user asked to upload a folder as its zip, made before the upload. One zip keeps the folder as one chip and one file for the agent, which can unzip it. The zip counts against the limit of 100 MB as each file does. A zip over the limit is not attached, and the notice of a file over 100 MB names checkout-screens.zip.',
      props: { composer: 'dropped-folder' },
    },
    {
      slug: 'unreadable-folder',
      title: 'A folder that cannot be read',
      description:
        'Cal dropped the screenshot and the folder checkout-screens together, and the browser could not read the folder. The screenshot is a chip at the place of the drop. The folder is not attached: the notice over the box names it, says that it could not be read, and says to attach the files in it. "Attach files" opens the file picker.',
      rationale:
        'A folder that the browser cannot read cannot become a zip. So the notice names the folder, as it names a file over 100 MB, and the files of the same drop stay.',
      props: { composer: 'unreadable-folder' },
    },
  ],
})
