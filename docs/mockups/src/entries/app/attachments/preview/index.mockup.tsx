import { defineScreen } from '@mokly/mokly'
import { AttachmentPreview } from '../../../../screens/attachmentPreviews'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

/** The workspace, with the file of the draft whose preview is open. */
const previewSchema = {
  ...workspaceStateSchema,
  required: [...workspaceStateSchema.required, 'preview'],
  properties: {
    ...workspaceStateSchema.properties,
    /** The file whose preview is open, or none. */
    preview: {
      enum: ['none', 'screenshot', 'console-log', 'folder-zip', 'large-log'],
    },
  },
} as const

export const attachmentsPreview = defineScreen({
  title: 'Preview a file of the draft',
  description:
    'Cal pressed the name of the screenshot in the message box, before Send. A dialog over the dimmed app shows the picture of the screenshot. Its header gives the kind, the name, and the size of the file, and Close. The picture keeps its proportions and fits the dialog. Escape, Close, and a press on the dimmed app close the dialog, and the caret stays where it was in the message. The same preview opens from the New workspace page and the New workspace dialog. On a phone, a tap on the name opens it.',
  rationale:
    'The user asked on 16 November 2026 that a press on a file in the message box opens it in a dialog, and that a pointer over it shows a small card. Before Send, the cloud computer does not have the file, so the browser draws the preview from its own copy of the file. So the preview needs no request, works while the file uploads, and works before the new workspace has a cloud computer. A file tab, as for a sent file, was not chosen, because the New workspace dialog has no file tabs and the copy is not in the cloud computer yet.',
  relatedDocs: [],
  propSchema: previewSchema,
  props: { ...readyWorkspace, composer: 'attachments', preview: 'screenshot' },
  render: ({ preview, ...state }, context) => (
    <WorkspaceScreen
      overlay={
        preview === 'none' ? undefined : <AttachmentPreview file={preview} />
      }
      state={state}
      viewport={context.viewport}
    />
  ),
  variants: [
    {
      slug: 'peek',
      title: 'Pointer over a file',
      description:
        'The pointer rests on the chip of the screenshot in the message box. After a short wait, a small card shows above the chip: the picture of the screenshot, then its kind, its name, and its size. The card of a text file shows its first lines, and the card of another file shows only the name and the size. The card goes when the pointer leaves the chip. A phone has no pointer, so its view shows no card.',
      rationale:
        'The card lets the member check a file without a press. It takes no pointer, so the × of the chip and the name below it keep working. The short wait keeps the card away while the pointer only passes over the text.',
      props: { composer: 'attachment-peek', preview: 'none' },
    },
    {
      slug: 'text',
      title: 'Preview a text file',
      description:
        'Cal pressed the name of the console log. The dialog shows the text of the log with line numbers, as the file tab shows a text file. A long text scrolls inside the dialog.',
      rationale:
        'A text file of up to 1 MB shows its text, and a picture of up to 20 MB shows its picture. A larger file says that previews show smaller files, with the two limits, so the tab of the browser never decodes a large file. The browser reads the file as UTF-8, and a file that is not UTF-8 text has no preview.',
      props: { preview: 'console-log' },
    },
    {
      slug: 'none',
      title: 'File without a preview',
      description:
        'Cal dropped a folder, which uploads as a zip, and pressed the name of the zip. The dialog says that previews show pictures and text files, and that the agent gets this file with the message. The preview opens also while the file uploads.',
      rationale:
        'The browser can draw only pictures and text. Other files keep the same dialog, so a press on each chip works the same way.',
      props: { composer: 'dropped-folder', preview: 'folder-zip' },
    },
    {
      slug: 'too-large',
      title: 'File over the preview limit',
      description:
        'Cal attached a full server log of 48 MB after the screenshot, and pressed its name in the message box. The dialog says that previews show smaller files: pictures up to 20 MB and text files up to 1 MB.',
      rationale:
        'The tab of the browser holds the whole text of a preview, and a picture loads from a data: address that holds all its bytes. The limits keep both small. The title gives the positive fact, and the limits stay in the body, as the copy rules of the product say.',
      props: { composer: 'attachment-large', preview: 'large-log' },
    },
  ],
})
