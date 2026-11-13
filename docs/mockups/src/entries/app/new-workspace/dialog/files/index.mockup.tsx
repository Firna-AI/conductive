import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogFiles = defineScreen({
  title: 'Uploading files',
  description:
    'The task is written, and the user attached a sketch and some notes, each as a chip at its place in the task. The sketch uploads, and its ring and "35%" show the share that the browser sent. The notes wait for their turn, with the spinner and "Uploading". Create is off until both are uploaded. The removal of a chip takes its file off the message.',
  rationale:
    'The dialog uses the chips and the rules of the New workspace page, as app/new-workspace/files shows. So a failed upload shows Try again in its chip. The paperclip puts each picked file at the caret, and the whole dialog takes a drop of files, as the Drop files state shows. A file over 100 MB gets its notice with the other notices of the dialog, as app/attachments/too-large shows in a session. Moved here from a saved state of the dialog page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message', files: 'uploading' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'drop',
      title: 'Drop files',
      description:
        'The task is written, and the notes have their place. The user drags the sketch over the dialog. The whole dialog card shows the drop state: a full border in the accent colour. The pointer is over the text after "as the sketch", so the drop caret stands there. A drop on the header, the notices, or the footer puts the files at the caret, or at the end. A phone always opens the page and has no drag, so its view has the caret where a pick from the paperclip goes.',
      rationale:
        'In the New workspace dialog, the message box is the whole dialog card, because the card holds the text, the controls, and their padding. So a drop anywhere on the card attaches, and its full border shows the drop state, as the border of the message box of a chat does in app/attachments/drop. The field draws the drop caret, and the real caret moves only at the drop, so a cancelled drag leaves the draft as it was.',
      props: { files: 'drop-over' },
    },
  ],
})
