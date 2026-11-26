import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesImage = defineScreen({
  title: 'Image',
  description:
    'A press on checkout-mobile.png in All files opened it in the temporary tab, with its picture. The picture keeps its proportions and fits the width and the height of the tab. A smaller picture keeps its own size. The zoom bar under the picture holds Zoom out, the zoom as a percentage of the own size, Zoom in, Fit, and Expand on desktop. The wheel and a pinch zoom about the pointer, and a drag moves a zoomed picture. A double press zooms a fitted picture to its own size, and a zoomed picture fits again. The header keeps Download, and Copy is off, as for every file that is not text. Its row in the list is marked.',
  rationale:
    'The user chose option B of decision 265 on 10 November 2026: the file tab shows a PNG, JPEG, GIF, or WebP file up to its read limit as a picture, for every image of the workspace. The tab knows an image by the name of the file, because the reads of the cloud computer give no image type for each image. An image over the read limit keeps the state of the limit, "Open this file in the terminal". An SVG file stays text with line numbers, because its source is what a member edits. Cal asked on 22 November 2026 for a zoom with the wheel and with a control, and for a way to expand the picture, because the detail of a wide screenshot was too small to read. A press opens an image in the temporary tab, as it opens each file, from option B of decision 284, which the user chose on 11 November 2026.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'image',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'cannot-draw',
      title: 'Image that does not draw',
      description:
        'social-card.png has the name of a picture, but the browser cannot draw its bytes. The tab shows "Download this file to open it", as for each binary file, with Download.',
      rationale:
        'A damaged file or a file with a wrong name still opens: its download gives the member the bytes, as for every other binary file.',
      props: { tab: 'image-not-drawn' },
    },
    {
      slug: 'from-answer',
      title: 'Screenshot from an answer',
      description:
        'A press on the picture of the screenshot in the answer of app/file-mentions/answers opened after.png in the temporary tab, at the end of the row. A press on its chip opens the same tab. The tab shows the whole screenshot, with the list of suggestions under the postcode field. The right column keeps Changes, as before the press. On a phone, the screenshot opens as a page of Files.',
      rationale:
        'The user chose B of screenshot decision 2 on 18 November 2026: a press on the picture of a Markdown image in an answer opens the file tab, as its link did before. A press opens a file in the temporary tab, from option B of decision 284. The tab shows the picture at the size of the tab, so the answer keeps its picture small.',
      props: {
        banner: 'ready-to-merge',
        conversation: 'file-answer',
        files: 'changes',
        tab: 'screenshot',
      },
      useCasePaths: ['user-flows/open-a-file-from-an-answer'],
    },
    {
      slug: 'expanded',
      title: 'Expanded picture',
      description:
        'A press on Expand in the zoom bar showed checkout-mobile.png in a large window over the whole app, the rail and the sidebar too, on the dim layer of a dialog. The header of the window names the file and holds Close. The picture fits the window as it opens, over the zoom bar without Expand, and it zooms and moves as in the tab. Close, Escape, and a press on the dim layer close the window, and the picture stays in its tab. While the window shows, the keys of the app do nothing, and Tab stays in the window. A phone shows the picture across the whole screen already, so it has no Expand.',
      rationale:
        'Cal asked on 22 November 2026 for a way to expand a picture. The window is the large window of an expanded Preview tab, from 20 November 2026, so the app has one way to show a tab larger.',
      props: { overlay: 'expanded-page' },
    },
  ],
})
